import { ActionResponse } from '@lecca-io/toolkit';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Execution, Workflow } from '@prisma/client';

import { Action } from '../../../apps/lib/action';
import { Trigger, TriggerResponse } from '../../../apps/lib/trigger';
import { CreditsService } from '../../global/credits/credits.service';
import { PrismaService } from '../../global/prisma/prisma.service';
import { ExecutionStatus } from '../executions/enums/execution-status.enum';
import { ExecutionsService } from '../executions/executions.service';
import { WorkflowAppsService } from '../workflow-apps/workflow-apps.service';

@Injectable()
export class WorkflowRunnerService {
  constructor(
    private prisma: PrismaService,
    private workflowAppService: WorkflowAppsService,
    private executionService: ExecutionsService,
    private credits: CreditsService,
  ) {}

  private queues: Map<string, Promise<void>> = new Map();

  async #runExecution({
    executionId,
    inputData,
    continueFromTheseNodeIds,
    isInitialRun,
  }: {
    executionId: string;
    inputData?: Record<string, any>;
    continueFromTheseNodeIds: string[] | undefined;
    /**
     * Is used to know whether this is part of the recursive call of the execution
     * or the initial call. We only charge credits on the initial run.
     */
    isInitialRun: boolean;
  }) {
    try {
      //Find the execution, else throw an error (shouldn't ever get here)
      const execution = await this.#getExecutionForRunner({
        executionId,
      });

      if (
        execution.status !== ExecutionStatus.RUNNING &&
        execution.status !== ExecutionStatus.NEEDS_INPUT &&
        execution.status !== ExecutionStatus.SCHEDULED
      ) {
        return;
      }

      //Find the workflow, else throw an error (shouldn't ever get here)
      const workflow: WorkflowForRunner = await this.prisma.workflow.findUnique(
        {
          where: {
            id: execution.workflow.id,
          },
          select: {
            id: true,
            name: true,
            isActive: true,
            nodes: true,
            edges: true,
            strategy: true,
          },
        },
      );

      //Check if the workflow is active
      //If not, then update the execution status to failed and return
      //This would happen if the workflow was deactivated while the execution was running
      if (!workflow.isActive) {
        await this.executionService.update({
          executionId: execution.id,
          data: {
            status: ExecutionStatus.FAILED,
            stoppedAt: new Date().toISOString(),
            statusMessage: 'Workflow is not active',
          },
        });

        return;
      }

      if (isInitialRun) {
        const credits = this.credits.transformCostToCredits({
          usageType: 'workflow-execution',
          data: {
            executionId,
          },
        });

        await this.credits.updateWorkspaceCredits({
          creditsUsed: credits,
          workspaceId: execution.workflow.project.workspace.id,
          projectId: execution.workflow.project.id,
          data: {
            ref: {
              executionId,
              workflowId: execution.workflow.id,
            },
            details: {},
          },
        });
      }

      const { nodes: nodesToRun, edges: edgesToAddToExecution } =
        await this.#findNodesAndEdgesForExecution({
          workflow,
          execution,
          inputData,
          executionId,
          continueFromTheseNodeIds,
        });

      if (nodesToRun.length === 0) {
        // Reload the execution to get the latest nodes
        const executionWithNodes = await this.prisma.execution.findUnique({
          where: {
            id: executionId,
          },
          select: {
            nodes: true,
            edges: true, // Include edges to help with branch detection
          },
        });

        // Check for any nodes that are not in SUCCESS state
        let needsInputStatusExists = false;
        let scheduledStatusExists = false;
        let failedStatusExists = false;
        let runningStatusExists = false;

        // Find any nodes that are still in progress in any branch
        (executionWithNodes.nodes as ExecutionNodeForRunner[]).forEach(
          (node) => {
            if (node.executionStatus !== 'SUCCESS') {
              switch (node.executionStatus) {
                case 'NEEDS_INPUT':
                  needsInputStatusExists = true;
                  break;
                case 'SCHEDULED':
                  scheduledStatusExists = true;
                  break;
                case 'FAILED':
                  failedStatusExists = true;
                  break;
                case 'RUNNING':
                  runningStatusExists = true;
                  break;
                default:
                  //success will be determined if there are no needsInputs or scheduled or failed nodes
                  break;
              }
            }
          },
        );

        if (
          needsInputStatusExists ||
          scheduledStatusExists ||
          failedStatusExists ||
          runningStatusExists
        ) {
          if (failedStatusExists) {
            await this.executionService.update({
              executionId: execution.id,
              data: {
                status: ExecutionStatus.FAILED,
                statusMessage: 'Execution failed',
              },
            });
          } else if (needsInputStatusExists) {
            await this.executionService.update({
              executionId: execution.id,
              data: {
                status: ExecutionStatus.NEEDS_INPUT,
                statusMessage: 'Execution needs input',
              },
            });
          } else if (scheduledStatusExists) {
            await this.executionService.update({
              executionId: execution.id,
              data: {
                status: ExecutionStatus.SCHEDULED,
                statusMessage: 'Execution scheduled to continue later',
              },
            });
          } else if (runningStatusExists) {
            // Keep the execution in running state
            // This ensures we don't prematurely end execution when nodes are still running
            await this.executionService.update({
              executionId: execution.id,
              data: {
                status: ExecutionStatus.RUNNING,
                statusMessage: 'Execution in progress',
              },
            });
          }

          return;
        } else {
          // Check if there are nodes with SUCCESS status that have no outgoing edges in the execution
          // These represent branch endpoints that need to be evaluated
          const edges = executionWithNodes.edges as EdgeForRunner[];
          const nodes = executionWithNodes.nodes as ExecutionNodeForRunner[];
          
          // Find all successful leaf nodes (nodes with no outgoing edges)
          const successfulLeafNodes = nodes.filter(node => {
            if (node.executionStatus !== 'SUCCESS') return false;
            
            // Check if this node has any outgoing edges
            const hasOutgoingEdges = edges.some(edge => edge.source === node.id);
            return !hasOutgoingEdges;
          });
          
          // If we have successful leaf nodes, the workflow is complete
          if (successfulLeafNodes.length > 0) {
            await this.executionService.update({
              executionId: execution.id,
              data: {
                status: ExecutionStatus.SUCCESS,
                stoppedAt: new Date().toISOString(),
                statusMessage: 'Execution completed successfully',
              },
            });
          } else {
            // This is an unusual state - all nodes are successful but none are leaf nodes
            // This suggests a potential cycle or an incomplete branch
            await this.executionService.update({
              executionId: execution.id,
              data: {
                status: ExecutionStatus.RUNNING,
                statusMessage: 'Execution continuing to process branches',
              },
            });
            
            // Try to find any nodes that have been executed but might need to continue
            // This helps recover from conditions where branching might have missed nodes
            const nodesWithSuccessStatus = nodes.filter(node => 
              node.executionStatus === 'SUCCESS'
            ).map(node => node.id);
            
            if (nodesWithSuccessStatus.length > 0) {
              // Attempt to continue execution with all successful nodes
              await this.#runExecution({
                executionId,
                continueFromTheseNodeIds: nodesWithSuccessStatus,
                isInitialRun: false,
              });
            }
          }

          return;
        }
      } else {
        await this.#addNodesAndEdgesToExecutionAndRunNodes({
          nodes: nodesToRun,
          edges: edgesToAddToExecution,
          executionId,
        });
      }
    } catch (err) {
      //We already catch in the addNodesAndEdgesToExecutionAndRunNodes for each node that is ran.
      //We throw errors to stop the execution of that node. If anything makes it in this catch block,
      //Then we have an actual runtime error with how we're running the execution recursion.
      console.error(err);
    }
  }

  async #findNodesAndEdgesForExecution({
    workflow,
    execution,
    inputData,
    executionId,
    continueFromTheseNodeIds,
  }: {
    workflow: WorkflowForRunner;
    execution: ExecutionForRunner;
    inputData: Record<string, any> | undefined;
    executionId: string;
    continueFromTheseNodeIds: string[] | undefined;
  }): Promise<{ nodes: WorkflowNodeForRunner[]; edges: EdgeForRunner[] }> {
    const nodesToRun: WorkflowNodeForRunner[] = [];
    const edgesToAddToExecution: EdgeForRunner[] = [];

    const workflowNodes: WorkflowNodeForRunner[] = workflow.nodes as any;
    const executionEdges: EdgeForRunner[] = execution.edges as any;
    const executionNodes: ExecutionNodeForRunner[] = execution.nodes as any;

    if (!workflowNodes || workflowNodes.length === 0) {
      await this.#failExecutionAndDisableWorkflow({
        executionId: execution.id,
        workflowId: workflow.id,
        message: 'No nodes found to run',
      });

      throw new NotFoundException('No nodes found to run');
    }

    //Find the nodes to continue execution from
    const nodesToContinueExecutionFrom = executionNodes.filter((node) => {
      // If specific node IDs are provided, use only those nodes
      if (continueFromTheseNodeIds?.length) {
        return continueFromTheseNodeIds.includes(node.id);
      } else {
        // Otherwise, find nodes that don't have outgoing edges 
        // or nodes that have a SUCCESS execution status but no next steps yet
        const connectedEdges = executionEdges.filter(
          (edge) => edge.source === node.id,
        );

        // For a clean initial run, use nodes without outgoing edges
        return connectedEdges.length === 0;
      }
    });

    if (
      !nodesToContinueExecutionFrom.length &&
      !continueFromTheseNodeIds?.length
    ) {
      //if there's no execution, then let's start from the trigger node.
      //It should be a scheduled or manual trigger because webhook and poll trigger nodes are added when they receive data.

      const triggerNode = (workflow.nodes as WorkflowNodeForRunner[]).find(
        (node) => node.nodeType === 'trigger',
      );

      if (!triggerNode) {
        throw new NotFoundException('Invalid Workflow. Trigger node not found');
      }

      if (workflow.strategy !== 'manual' && workflow.strategy !== 'schedule') {
        throw new ForbiddenException(
          'Workflow is not valid for manual execution. Only manually run and scheduled workflows can be triggered manually',
        );
      }

      //Add execution node to the execution
      await this.prisma.execution.update({
        where: {
          id: executionId,
        },
        data: {
          nodes: [triggerNode], //Add it without any output data. #runNode will update it with the output of the node execution
        },
      });

      await this.#runNode({
        node: triggerNode,
        execution,
        type: 'trigger',
        inputData,
      });

      //This will have all the data necessary
      const triggerNodeAfterItHasBeenExecuted =
        await this.prisma.execution.findUnique({
          where: {
            id: executionId,
          },
          select: {
            //Select first element in jsonb array
            nodes: true,
          },
        });

      const executedTriggerNode = (
        triggerNodeAfterItHasBeenExecuted.nodes as ExecutionNodeForRunner[]
      )[0];

      if (!executedTriggerNode) {
        //Should never get here since above we ran #runNode. So there will be one, and if it failed it will have thrown an error already
        throw new Error('Trigger node not found in the execution');
      }

      await this.#findConnectedNodesToRun({
        startNode: executedTriggerNode,
        workflow,
        nodesToRun,
        edgesToAddToExecution,
        execution,
      });
    } else {
      //Just add the last executed nodes to continue where workflow left off.
      for (const executedNode of nodesToContinueExecutionFrom) {
        if (
          executedNode.executionStatus === 'NEEDS_INPUT' ||
          executedNode.executionStatus === 'SCHEDULED'
        ) {
          //When the input is added, the executed node will be updated to `SUCCESS` and it will run the execution again.
          //Same with scheduled nodes. They will be updated to `SUCCESS` when the scheduled time comes.
        } else {
          await this.#findConnectedNodesToRun({
            startNode: executedNode,
            workflow,
            nodesToRun,
            edgesToAddToExecution,
            execution,
          });
        }
      }
    }

    return { nodes: nodesToRun, edges: edgesToAddToExecution };
  }

  async #findConnectedNodesToRun({
    startNode,
    workflow,
    nodesToRun,
    edgesToAddToExecution,
    execution,
    lastNonPlaceholderNodeId,
  }: {
    startNode: WorkflowNodeForRunner;
    workflow: WorkflowForRunner;
    nodesToRun: WorkflowNodeForRunner[];
    edgesToAddToExecution: EdgeForRunner[];
    execution: ExecutionForRunner;
    /**
     * When we recursively call this function, we want the placeholder edge that we are skipping
     * to connect to the last non-placeholder node. So we have to pass the reference into the function.
     * We use this to set the edge source from the placeholder to the last non-placeholder node.
     */
    lastNonPlaceholderNodeId?: string;
  }) {
    const edges: EdgeForRunner[] = workflow.edges as any;
    const nodes: WorkflowNodeForRunner[] = workflow.nodes as any;

    let connectedEdges: EdgeForRunner[] = [];

    if (
      startNode.actionId === 'flow-control_action_conditional-paths' ||
      startNode.actionId === 'flow-control_action_manually-decide-paths'
    ) {
      /**
       * We'll have to run the node to figure out which path to take (which edge to follow).
       * Some decide-path nodes only select one path on the split, while others may select multiple paths.
       * Some may select no paths at all
       *
       * The startNode.output will contain the paths to take.
       */

      connectedEdges =
        edges.filter((edge) =>
          startNode.output.pathsToTake?.includes(edge.id),
        ) ?? [];
    } else {
      //Find the edges connected to the start node
      connectedEdges = edges.filter((edge) => edge.source === startNode.id);
    }

    //If there are no connected edges then there are no more nodes to run.
    if (connectedEdges.length === 0) {
      return;
    }

    //Loop through the connected edges
    for (const edge of connectedEdges) {
      //Find the target node
      const targetNode = nodes.find((node) => node.id === edge.target);

      //If the target node is not found, then the workflow is invalid
      if (!targetNode) {
        await this.#failExecutionAndDisableWorkflow({
          executionId: execution.id,
          workflowId: workflow.id,
          message: 'Invalid workflow. The edge is not connected to a node.',
        });

        throw new BadRequestException('Invalid workflow');
      }

      //If the target node is a placeholder, then find the connected nodes
      //This is a recursive function
      if (targetNode.nodeType === 'placeholder') {
        await this.#findConnectedNodesToRun({
          startNode: targetNode,
          workflow,
          nodesToRun,
          edgesToAddToExecution,
          execution,
          /**
           * startNode.id may be a placeholder node. We don't want placeholder's nodes in the execution flow.
           * So we pass the lastNonPlaceholderNodeId into the recursive function.
           */
          lastNonPlaceholderNodeId: lastNonPlaceholderNodeId ?? startNode.id,
        });
      } else {
        //Removing the output before pushing to the nodesToRun array.
        //Doing this because we don't want the execution nodes to have output from the workflow nodes.
        //This is because workflow node outputs are mock data or test data and not data from the execution.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { output, ...nodeData } = targetNode;

        nodesToRun.push(nodeData);

        if (lastNonPlaceholderNodeId) {
          //Setting the source of the edge to the last non-placeholder node if it exists
          /**
           * action -> placeholder -> placeholder -> action
           * We want the edge from the first placeholder to Y to have the source as X
           */
          edge.source = lastNonPlaceholderNodeId;
          edgesToAddToExecution.push(edge);
        }

        edgesToAddToExecution.push(edge);
      }
    }
  }

  async #addNodesAndEdgesToExecutionAndRunNodes({
    nodes,
    edges,
    executionId,
  }: {
    nodes: WorkflowNodeForRunner[];
    edges: EdgeForRunner[];
    executionId: string;
  }) {
    //Add the nodes to the execution
    const execution = await this.#getExecutionForRunner({
      executionId,
    });

    const existingExecutionNodes: ExecutionNodeForRunner[] =
      execution.nodes as any;

    const newExecutionNodes: ExecutionNodeForRunner[] = nodes.map((node) => ({
      ...node,
      executionStatus: 'RUNNING',
    }));

    //Add the edges to the execution
    const existingExecutionEdges: EdgeForRunner[] = execution.edges as any;
    const newExecutionEdges = edges;

    const updatedNodes = [...existingExecutionNodes, ...newExecutionNodes];
    const updatedEdges = [...existingExecutionEdges, ...newExecutionEdges];

    //Update the execution with the new nodes and edges
    await this.executionService.update({
      executionId: execution.id,
      data: {
        nodes: updatedNodes,
        edges: updatedEdges,
      },
    });

    // First, run all nodes to complete their execution
    for (const node of nodes) {
      try {
        await this.#runNode({ node, execution, type: 'action' });
      } catch {
        //Okay to catch here. We throw errors to stop the next node from running.
      }
    }

    // After all nodes have completed, continue execution for all successful nodes
    // This ensures branches don't interfere with each other's state
    const executionAfterNodesRun = await this.#getExecutionForRunner({
      executionId,
    });

    const successfulNodeIds = (
      executionAfterNodesRun.nodes as ExecutionNodeForRunner[]
    )
      .filter((node) => {
        // Only continue from nodes that were just executed and succeeded
        return (
          nodes.some((n) => n.id === node.id) &&
          node.executionStatus === 'SUCCESS'
        );
      })
      .map((node) => node.id);

    if (successfulNodeIds.length > 0) {
      // Continue execution with all successful nodes
      await this.#runExecution({
        executionId,
        continueFromTheseNodeIds: successfulNodeIds,
        isInitialRun: false,
      });
    }
  }

  async #failExecutionAndDisableWorkflow({
    executionId,
    workflowId,
    message,
  }: {
    executionId: string;
    workflowId: string;
    message: string;
  }) {
    await this.executionService.update({
      executionId: executionId,
      data: {
        status: ExecutionStatus.FAILED,
        stoppedAt: new Date().toISOString(),
        statusMessage: message,
      },
    });

    await this.prisma.workflow.update({
      where: {
        id: workflowId,
      },
      data: {
        isActive: false,
      },
    });
  }

  async #runNode({
    node,
    execution,
    type,
    inputData,
  }: {
    node: WorkflowNodeForRunner;
    execution: ExecutionForRunner;
    type: 'action' | 'trigger';
    inputData?: Record<string, any>;
  }) {
    const appId = node.appId;
    const value = node.value as Record<string, any>;
    const app = this.workflowAppService.apps[appId];

    let action: Action;
    let trigger: Trigger;

    if (type === 'action') {
      action = app.actionMap[node.actionId];

      if (!action) {
        await this.#failExecutionAndDisableWorkflow({
          executionId: execution.id,
          workflowId: execution.workflow.id,
          message: `Action not found: ${node.actionId}`,
        });

        throw new NotFoundException('Action not found');
      } else if (node.triggerId) {
        await this.#failExecutionAndDisableWorkflow({
          executionId: execution.id,
          workflowId: execution.workflow.id,
          message: `Invalid workflow. Trigger node must be at the start of the workflow.`,
        });

        throw new NotFoundException(
          'Trigger found in the middle of the workflow',
        );
      }
    } else {
      trigger = app.triggerMap[node.triggerId];

      if (!trigger) {
        await this.#failExecutionAndDisableWorkflow({
          executionId: execution.id,
          workflowId: execution.workflow.id,
          message: `Trigger not found: ${node.triggerId}`,
        });

        throw new NotFoundException('Trigger not found');
      }
    }

    const startTime = new Date();

    let response: ActionResponse<unknown> | TriggerResponse<unknown>;

    if (type === 'action') {
      response = await action.prepareAndRunAction({
        configValue: value,
        nodeId: node.id,
        workflowId: execution.workflow.id,
        executionId: execution.id,
        workspaceId: execution.workflow.project.workspace.id,
        projectId: execution.workflow.project.id,
        agentId: undefined,
        taskId: undefined,
      });
    } else {
      response = await trigger.prepareAndRunTrigger({
        configValue: value,
        nodeId: node.id,
        workflowId: execution.workflow.id,
        executionId: execution.id,
        workspaceId: execution.workflow.project.workspace.id,
        projectId: execution.workflow.project.id,
        agentId: undefined,
        inputData: inputData,
      });
    }

    const endTime = new Date();

    if (response) {
      if ((response as ActionResponse<unknown>).needsInput) {
        await this.#handleNeedsInputResponse({
          responseData: (response as ActionResponse<unknown>).needsInput,
          node,
          execution,
          startTime,
          endTime,
        });
      } else if ((response as ActionResponse<unknown>).scheduled) {
        await this.#handleScheduledResponse({
          responseData: (response as ActionResponse<unknown>).scheduled,
          node,
          execution,
          startTime,
          endTime,
        });
      } else if (response.success) {
        await this.#handleSuccessResponse({
          responseData:
            //Triggers always return array responses
            type === 'trigger'
              ? (response.success as any[])?.[0]
              : response.success,
          node,
          execution,
          startTime,
          endTime,
        });
      } else {
        await this.#handleFailureResponse({
          responseData: response.failure,
          node,
          execution,
          startTime,
          endTime,
        });
      }
    }

    return;
  }

  async #getExecutionForRunner({ executionId }: { executionId: string }) {
    return (await this.executionService.findOne({
      executionId,
      throwNotFoundException: true,
      expansion: {
        workflow: true,
        status: true,
        nodes: true,
        edges: true,
        project: true,
        workspace: true,
      },
    })) as unknown as ExecutionForRunner;
  }

  async #handleNeedsInputResponse({
    responseData,
    node,
    execution,
    startTime,
    endTime,
  }: {
    responseData: ActionResponse<unknown>['needsInput'];
    node: ExecutionNodeForRunner;
    execution: ExecutionForRunner;
    startTime: Date;
    endTime: Date;
  }) {
    await this.executionService.update({
      executionId: execution.id,
      data: {
        status: ExecutionStatus.NEEDS_INPUT,
        stoppedAt: new Date().toISOString(),
        statusMessage: 'Execution needs input',
      },
    });

    await this.#updateExecutionNode({
      nodeId: node.id,
      executionId: execution.id,
      data: {
        executionStatus: 'NEEDS_INPUT',
        executionStatusMessage: 'Waiting for input',
        output: responseData,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    });

    //This isn't actually an error, it just stops the execution
    throw new Error('Execution needs input');
  }

  async #handleScheduledResponse({
    responseData,
    node,
    execution,
    startTime,
    endTime,
  }: {
    responseData: ActionResponse<unknown>['scheduled'];
    node: ExecutionNodeForRunner;
    execution: ExecutionForRunner;
    startTime: Date;
    endTime: Date;
  }) {
    //All scheduled responses need to have at least the scheduledAt property on the response.
    const scheduledAt = (responseData as { scheduledAt: string } & unknown)
      .scheduledAt;

    if (!scheduledAt) {
      throw new BadRequestException(
        `Invalid scheduled response. Must contain scheduledAt: ${responseData}`,
      );
    }

    const existingExecutionWithContinueExecutionAt =
      await this.executionService.findOne({
        executionId: execution.id,
        expansion: { continueExecutionAt: true },
      });

    /**
     * Determine the earliest continueExecutionAt value.
     * If continueExecutionAt is already set on the existing execution,
     * we won't override it with a later value. Instead, we'll compare
     * the new scheduledAt value with the existing continueExecutionAt
     * and keep the earliest one.
     */
    let earliestContinueExecutionAtValue = new Date(scheduledAt);

    // Check if there's an existing continueExecutionAt value
    if (existingExecutionWithContinueExecutionAt.continueExecutionAt) {
      const scheduledAtDate = new Date(scheduledAt);

      // Compare the two dates to find the earliest one
      if (
        existingExecutionWithContinueExecutionAt.continueExecutionAt <
        scheduledAtDate
      ) {
        earliestContinueExecutionAtValue = new Date(
          existingExecutionWithContinueExecutionAt.continueExecutionAt,
        );
      }
    }
    await this.executionService.update({
      executionId: execution.id,
      data: {
        status: ExecutionStatus.SCHEDULED,
        stoppedAt: new Date().toISOString(),
        continueExecutionAt: earliestContinueExecutionAtValue.toISOString(),
        statusMessage: 'Execution scheduled to continue later',
      },
    });

    await this.#updateExecutionNode({
      nodeId: node.id,
      executionId: execution.id,
      data: {
        executionStatus: 'SCHEDULED',
        executionStatusMessage: 'Scheduled to continue later',
        output: responseData,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    });

    //This isn't actually an error, it just stops the execution
    throw new Error('Execution scheduled to continue later');
  }

  async #handleSuccessResponse({
    responseData,
    node,
    execution,
    startTime,
    endTime,
  }: {
    responseData:
      | ActionResponse<unknown>['success']
      | TriggerResponse<unknown>['success'];
    node: ExecutionNodeForRunner;
    execution: ExecutionForRunner;
    startTime: Date;
    endTime: Date;
  }) {
    await this.#updateExecutionNode({
      nodeId: node.id,
      executionId: execution.id,
      data: {
        executionStatus: 'SUCCESS',
        executionStatusMessage: 'Ran successfully',
        output: responseData,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    });
  }

  async #handleFailureResponse({
    responseData,
    node,
    execution,
    startTime,
    endTime,
  }: {
    responseData:
      | ActionResponse<unknown>['failure']
      | TriggerResponse<unknown>['failure'];
    node: ExecutionNodeForRunner;
    execution: ExecutionForRunner;
    startTime: Date;
    endTime: Date;
  }) {
    await this.executionService.update({
      executionId: execution.id,
      data: {
        status: ExecutionStatus.FAILED,
        stoppedAt: new Date().toISOString(),
        statusMessage: responseData,
      },
    });

    await this.#updateExecutionNode({
      nodeId: node.id,
      executionId: execution.id,
      data: {
        executionStatus: 'FAILED',
        executionStatusMessage: responseData,
        output: null,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    });

    //Maybe if the node has a `retry` field, then we can retry the node
    //Or if it has a continue on failure field, then we can continue to the next node
    throw new BadRequestException('Node failed with message: ' + responseData);
  }

  async #updateExecutionNode({
    nodeId,
    executionId,
    data,
  }: {
    nodeId: string;
    executionId: string;
    data: Pick<
      ExecutionNodeForRunner,
      | 'output'
      | 'executionStatus'
      | 'executionStatusMessage'
      | 'startTime'
      | 'endTime'
    >;
  }) {
    //This queue is necessary so that the execution nodes are updated in the correct order.
    //If we didn't have this queue, they would all update at the same time and sometimes overwrite each other.
    //So node a finishes, but node b is still running and then it's old output overwrites node a's new output.
    await this.#addToExecutionRuntimeQueue(executionId, async () => {
      // Fetch the execution with nodes
      const executionWithNodes = await this.executionService.findOne({
        executionId,
        expansion: { nodes: true },
      });

      const nodes: ExecutionNodeForRunner[] = executionWithNodes.nodes as any;
      const nodeIndex = nodes.findIndex((node) => node.id === nodeId);

      if (nodeIndex === -1) {
        throw new NotFoundException('Node not found');
      }

      const updatedNodes = [...nodes];

      // Update the specific node with the new data
      const updatedNodeData = {
        ...updatedNodes[nodeIndex],
        ...data,
      };

      updatedNodes[nodeIndex] = updatedNodeData;

      // Save the updated nodes back to the execution
      await this.executionService.update({
        executionId: executionId,
        data: {
          nodes: updatedNodes,
        },
      });
    });
  }

  @OnEvent('workspaceExecutionQueue.start')
  async handleRunExecutionEventQueue(
    payload: RunExecutionQueueForWorkspacePayload,
  ) {
    const { workspaceId } = payload;

    if (!workspaceId) {
      throw new BadRequestException(
        `Invalid payload, workspaceId is required: ${payload}`,
      );
    }

    //1. Get workspace queue if it's not running. If it is, then we'll stop here since the queue is already running
    const pendingWorkspaceQueue =
      await this.prisma.workspaceExecutionQueue.findFirst({
        where: {
          AND: [
            { FK_workspaceId: workspaceId },
            {
              status: 'PENDING',
            },
          ],
        },
        select: {
          id: true,
        },
      });

    if (!pendingWorkspaceQueue) {
      return;
    }

    //2. Set the queue to running, and fetch all the items
    await this.prisma.workspaceExecutionQueue.update({
      where: {
        id: pendingWorkspaceQueue.id,
      },
      data: {
        status: 'RUNNING',
      },
    });

    //3. Loop through all items, and run the execution one at a time.
    //   once the execution is complete, then delete the item from the queue
    //   and move to the next item. If there are no items left, check if there are any new items
    //  in the queue. If there are, then repeat until there are no items left.
    await this.#getQueueItemsAndRunExecutions({
      workspaceId,
    });

    //4. Set the queue status to 'PENDING' since all items are done
    await this.prisma.workspaceExecutionQueue.update({
      where: {
        id: pendingWorkspaceQueue.id,
      },
      data: {
        status: 'PENDING',
      },
    });
  }

  @OnEvent('workspaceExecution.immediatelyRun')
  async immediatelyRunExecution(payload: ImmediatelyRunExecutionPayload) {
    const { executionId, inputData, continueFromTheseNodeIds } = payload;

    await this.#runExecution({
      executionId: executionId,
      inputData,
      continueFromTheseNodeIds: continueFromTheseNodeIds,
      isInitialRun: true,
    });
  }

  async #getQueueItemsAndRunExecutions({
    workspaceId,
  }: {
    workspaceId: string;
  }) {
    const workspaceQueueWithItems =
      await this.prisma.workspaceExecutionQueue.findUnique({
        where: {
          FK_workspaceId: workspaceId,
        },
        select: {
          items: {
            orderBy: {
              createdAt: 'asc',
            },
            select: {
              id: true,
              FK_executionId: true,
            },
          },
        },
      });

    if (workspaceQueueWithItems.items.length) {
      for (const item of workspaceQueueWithItems.items) {
        await this.#runExecution({
          executionId: item.FK_executionId,
          continueFromTheseNodeIds: undefined, //Because we're always starting from the trigger node when queueing
          isInitialRun: true,
        });

        await this.prisma.workspaceExecutionQueueItem.delete({
          where: {
            id: item.id,
          },
        });
      }

      //Recursively call this function to continue running until there are no items left
      //this is in case there are new items added to the queue while we're running the current items
      await this.#getQueueItemsAndRunExecutions({ workspaceId });
    } else {
      return;
    }
  }

  // Method to add a task to the queue
  async #addToExecutionRuntimeQueue(
    executionId: string,
    task: () => Promise<void>,
  ): Promise<void> {
    const existingQueue = this.queues.get(executionId) || Promise.resolve();

    const newQueue = existingQueue.then(task).catch(console.error); // Ensure that errors do not block the queue

    this.queues.set(executionId, newQueue);

    // Once the current queue is completed, remove it
    newQueue.finally(() => {
      if (this.queues.get(executionId) === newQueue) {
        this.queues.delete(executionId);
      }
    });

    return newQueue;
  }
}

export type WorkflowForRunner = Pick<
  Workflow,
  'id' | 'name' | 'nodes' | 'edges' | 'isActive' | 'strategy'
>;

export type ExecutionForRunner = Pick<
  Execution,
  'id' | 'status' | 'nodes' | 'edges'
> & {
  workflow: Pick<Workflow, 'id' | 'name'> & {
    project: {
      id: string;
      name: string;
      workspace: { id: string; name: string };
    };
  };
};

export type WorkflowNodeForRunner = {
  id: string;
  position: { x: number; y: number };
  appId: string;
  nodeType: 'action' | 'trigger' | 'placeholder' | 'decide-path';
  actionId: string | undefined;
  triggerId: string | undefined;
  description: string;
  name: string;
  value: Record<string, any>;
  raw: Record<string, any>;
  output?: any;
  references?: NodeReference;
  variables?: NodeVariable;
  isListeningForWebhooksTest?: boolean;
};

export type ExecutionNodeForRunner = WorkflowNodeForRunner & {
  /**
   * `RUNNING` - Action is running normally
   *
   * `SUCCESS` - Action completed successfully
   *
   * `FAILED` - Action failed
   *
   * `RUNNING` will be the default when a node is pushed to the executions.
   * After a node runs, it will be updated to `SUCCESS` or `FAILED`
   */
  executionStatus?:
    | 'RUNNING'
    | 'SUCCESS'
    | 'FAILED'
    | 'NEEDS_INPUT'
    | 'SCHEDULED';

  /**
   * A message for the User to understand the status of the node
   */
  executionStatusMessage?: string;

  /**
   * The time when the node started running
   */
  startTime?: string;

  /**
   * The time when the node stopped running
   */
  endTime?: string;
};

export type EdgeForRunner = {
  id: string;
  source: string;
  target: string;
  type: 'workflow' | 'placeholder';
};

export type RunExecutionQueueForWorkspacePayload = {
  workspaceId: string;
};

export type ImmediatelyRunExecutionPayload = {
  executionId: string;

  /**
   * At the moment, this is only data that is injected into the trigger on a manual execution.
   * So for the "Manually Run" trigger or any other triggers that manually run in the future.
   */
  inputData?: Record<string, any>;

  /**
   * This is used when a scheduled node reaches its scheduled time or a node needs input and the input is provided.
   * We only want to run the execution from those nodes instead of running the entire execution.
   * This is because an execution may be running when a scheduled node reaches its time or when a node needs input.
   * and we don't want 2 concurrent executions running.
   */
  continueFromTheseNodeIds: string[] | undefined;
};

export type NodeReference = {
  [key: string]: Record<string, any>;
};

export type NodeVariable = {
  [key: string]: Record<string, any>;
};
