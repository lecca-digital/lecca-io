import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryResponse } from '@pinecone-database/pinecone';

import { ServerConfig } from '../../../config/server.config';
import { JwtUser } from '../../../types/jwt-user.type';
import {
  AiProvider,
  AiProviderService,
} from '../../global/ai-provider/ai-provider.service';
import { CreditsService } from '../../global/credits/credits.service';
import {
  PineconeMetadata,
  PineconeService,
} from '../../global/pinecone/pinecone.service';
import { PrismaService } from '../../global/prisma/prisma.service';
import { S3ManagerService } from '../../global/s3/s3.service';

import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { KnowledgeExpansionDto } from './dto/knowledge-expansion.dto';
import { KnowledgeFilterByDto } from './dto/knowledge-filter-by.dto';
import { KnowledgeIncludeTypeDto } from './dto/knowledge-include-type.dto';
import { SaveUploadedTextToKnowledgeDto } from './dto/save-uploaded-text-to-knowledge.dto';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';

@Injectable()
export class KnowledgeService {
  constructor(
    private prisma: PrismaService,
    private pineconeService: PineconeService,
    private s3Manager: S3ManagerService,
    private credits: CreditsService,
    private aiProviders: AiProviderService,
  ) {}

  async create({
    data,
    workspaceId,
    expansion,
  }: {
    data: CreateKnowledgeDto;
    workspaceId: string;
    expansion: KnowledgeExpansionDto;
  }) {
    let FK_projectId: string | undefined;
    if (data.projectId) {
      const projectIsInWorkspace = await this.prisma.project.findFirst({
        where: {
          AND: [{ id: data.projectId }, { FK_workspaceId: workspaceId }],
        },
      });

      if (!projectIsInWorkspace) {
        throw new NotFoundException('Project does not belong to workspace');
      }

      FK_projectId = data.projectId;
      delete data.projectId;
    }

    this.#validateChunkSizeAndOverlap(data);

    await this.#checkKnowledgeLimitForWorkspacePlan({
      workspaceId,
    });

    const newKnowledge = await this.prisma.knowledge.create({
      data: {
        ...data,
        dimensions: data.dimensions ?? undefined,
        embeddingModel:
          data.embeddingModel ?? ServerConfig.DEFAULT_EMBEDDING_MODEL,
        embeddingProvider:
          data.embeddingProvider ?? ServerConfig.DEFAULT_EMBEDDING_PROVIDER,
        indexName: ServerConfig.PINECONE_INDEX_NAME,
        FK_workspaceId: workspaceId,
        FK_projectId,
      },
      select: {
        id: true,
      },
    });

    return this.findOne({
      knowledgeId: newKnowledge.id,
      expansion,
    });
  }

  async findOne({
    knowledgeId,
    expansion,
    throwNotFoundException,
  }: {
    knowledgeId: string;
    expansion?: KnowledgeExpansionDto;
    throwNotFoundException?: boolean;
  }) {
    if (!knowledgeId) {
      //If there is no id, that means that another method is calling this method without an id.
      //Prisma will throw an error if we don't provide an id, so we throw a custom error here or return null.
      if (throwNotFoundException) {
        throw new NotFoundException('Knowledge not found');
      } else {
        return null;
      }
    }

    const knowledge = await this.prisma.knowledge.findUnique({
      where: {
        id: knowledgeId,
      },
      select: {
        id: true,
        name: true,
        description: expansion?.description ?? false,
        createdAt: expansion?.createdAt ?? false,
        updatedAt: expansion?.updatedAt ?? false,
        indexName: expansion?.indexName ?? false,
        chunkSize: expansion?.chunkSize ?? false,
        chunkOverlap: expansion?.chunkOverlap ?? false,
        embeddingModel: expansion?.embeddingModel ?? false,
        embeddingProvider: expansion?.embeddingProvider ?? false,
        dimensions: expansion?.dimensions ?? false,
        _count: expansion?.countVectorRefs
          ? {
              select: {
                vectorRefs: !!expansion?.countVectorRefs,
              },
            }
          : false,
        vectorRefs: expansion?.vectorRefs
          ? {
              select: {
                id: true,
                FK_knowledgeId: true,
              },
            }
          : false,
        usage: expansion?.usage
          ? {
              select: {
                promptTokens: true,
              },
            }
          : false,
        workspace: expansion?.workspace
          ? {
              select: {
                id: true,
                name: true,
              },
            }
          : false,
        project: expansion?.project
          ? {
              select: {
                id: true,
                name: true,
              },
            }
          : false,
      },
    });

    if (!knowledge && throwNotFoundException) {
      throw new NotFoundException('Knowledge not found');
    }

    return knowledge;
  }

  async update<T>({
    knowledgeId,
    data,
    expansion,
  }: {
    knowledgeId: string;
    data: UpdateKnowledgeDto | T;
    expansion?: KnowledgeExpansionDto;
  }) {
    this.#validateChunkSizeAndOverlap(data as CreateKnowledgeDto);

    const knowledge = await this.prisma.knowledge.update({
      where: { id: knowledgeId },
      data,
      select: {
        id: true,
      },
    });

    return this.findOne({
      knowledgeId: knowledge.id,
      expansion,
    });
  }

  async findAllForWorkspace({
    jwtUser,
    workspaceId,
    expansion,
    filterBy,
    includeType,
  }: {
    jwtUser: JwtUser;
    workspaceId: string;
    includeType?: KnowledgeIncludeTypeDto;
    filterBy?: KnowledgeFilterByDto;
    expansion?: KnowledgeExpansionDto;
  }) {
    return this.prisma.knowledge.findMany({
      where: {
        AND: [
          { FK_workspaceId: workspaceId },
          filterBy?.projectId
            ? {
                FK_projectId: filterBy.projectId,
              }
            : {},
          //Filters down connections project has access to (global workspace and project owned)
          filterBy?.projectAccessId
            ? {
                OR: [
                  {
                    FK_projectId: filterBy.projectAccessId,
                  },
                  {
                    FK_projectId: null,
                  },
                ],
              }
            : {},
          includeType?.all
            ? jwtUser?.roles?.includes('MAINTAINER')
              ? {}
              : {
                  OR: [
                    {
                      FK_projectId: null,
                    },
                    {
                      project: {
                        workspaceUsers: {
                          some: {
                            id: jwtUser.workspaceUserId,
                          },
                        },
                      },
                    },
                  ],
                }
            : {
                project: {
                  workspaceUsers: {
                    some: {
                      id: jwtUser.workspaceUserId,
                    },
                  },
                },
              },
        ],
      },
      select: {
        id: true,
        name: true,
        description: expansion?.description ?? false,
        createdAt: expansion?.createdAt ?? false,
        updatedAt: expansion?.updatedAt ?? false,
        indexName: expansion?.indexName ?? false,
        chunkSize: expansion?.chunkSize ?? false,
        chunkOverlap: expansion?.chunkOverlap ?? false,
        embeddingModel: expansion?.embeddingModel ?? false,
        embeddingProvider: expansion?.embeddingProvider ?? false,
        dimensions: expansion?.dimensions ?? false,
        _count: expansion?.countVectorRefs
          ? {
              select: {
                vectorRefs: !!expansion?.countVectorRefs,
              },
            }
          : false,
        vectorRefs: expansion?.vectorRefs
          ? {
              select: {
                id: true,
                FK_knowledgeId: true,
              },
            }
          : false,
        usage: expansion?.usage
          ? {
              select: {
                promptTokens: true,
              },
            }
          : false,
        workspace: expansion?.workspace
          ? {
              select: {
                id: true,
                name: true,
              },
            }
          : false,
        project: expansion?.project
          ? {
              select: {
                id: true,
                name: true,
              },
            }
          : false,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async delete({ knowledgeId }: { knowledgeId: string }) {
    const knowledgeToDelete = await this.findOne({
      knowledgeId,
      expansion: {
        indexName: true,
        workspace: true,
        vectorRefs: true,
      },
      throwNotFoundException: true,
    });

    await this.s3Manager.deletePath(
      `workspaces/${knowledgeToDelete.workspace.id}/knowledge/${knowledgeId}`,
    );

    await this.prisma.knowledge.delete({
      where: {
        id: knowledgeId,
      },
    });

    if (knowledgeToDelete.vectorRefs.length) {
      this.pineconeService.deleteMany({
        workspaceId: knowledgeToDelete.workspace.id,
        indexName: knowledgeToDelete.indexName,
        idsToDelete: knowledgeToDelete.vectorRefs.map((ref) => ref.id),
      });
    }

    return true;
  }

  async clearKnowledge({ knowledgeId, workspaceId }: { knowledgeId: string; workspaceId: string }) {
    const knowledgeToClear = await this.findOne({
      knowledgeId,
      expansion: {
        indexName: true,
        vectorRefs: true,
      },
      throwNotFoundException: true,
    });

    // Delete all vector references but keep the notebook structure
    if (knowledgeToClear.vectorRefs.length) {
      // Delete all vector ref files from S3
      await this.s3Manager.deletePath(
        `workspaces/${workspaceId}/knowledge/${knowledgeId}/vectorRefs`,
      );

      // Delete all vector refs from database
      await this.prisma.knowledgeVectorRef.deleteMany({
        where: {
          FK_knowledgeId: knowledgeId,
        },
      });

      // Delete all vector ref groups that are now empty
      await this.prisma.knowledgeVectorRefGroup.deleteMany({
        where: {
          vectorRefs: {
            none: {},
          },
        },
      });

      // Delete vectors from Pinecone
      await this.pineconeService.deleteMany({
        workspaceId,
        indexName: knowledgeToClear.indexName,
        idsToDelete: knowledgeToClear.vectorRefs.map((ref) => ref.id),
      });
    }

    return true;
  }

  queryKnowledge = async ({
    query,
    workspaceId,
    knowledgeId,
    limit,
  }: {
    query: string;
    workspaceId: string;
    knowledgeId: string;
    limit?: number;
  }) => {
    const knowledge = await this.prisma.knowledge.findUnique({
      where: {
        id: knowledgeId,
      },
      select: {
        indexName: true,
        FK_projectId: true,
        embeddingModel: true,
        embeddingProvider: true,
        dimensions: true,
      },
    });

    if (!knowledge) {
      throw new NotFoundException('Knowledge notebook not found');
    }

    const usageType = this.credits.getUsageTypeFromEmbeddingModel({
      model: knowledge.embeddingModel as any,
    });

    await this.credits.checkIfWorkspaceHasEnoughCredits({
      usageType,
      workspaceId,
    });

    const embeddingProviderClient =
      this.aiProviders.getAiEmbeddingProviderClient({
        aiProvider: knowledge.embeddingProvider as AiProvider,
        embeddingModel: knowledge.embeddingModel,
        llmConnection: undefined,
        requestedDimensionSize: knowledge.dimensions,
        workspaceId,
      });

    const embeddingResponse = await embeddingProviderClient.doEmbed({
      values: [query],
    });

    const creditsUsed = this.credits.transformCostToCredits({
      usageType,
      data: {
        numEmbeddings: 1,
      },
    });

    await this.credits.updateWorkspaceCredits({
      creditsUsed,
      workspaceId,
      projectId: knowledge.FK_projectId,
      data: {
        ref: {
          knowledgeId,
        },
        details: {
          reason: 'querying knowledge',
        },
      },
    });

    const queryResponse = await this.pineconeService.query({
      indexName: knowledge.indexName,
      workspaceId,
      projectId: knowledge.FK_projectId,
      knowledgeId: knowledgeId,
      queryEmbedding: embeddingResponse.embeddings.flatMap((d) => d),
      limit,
    });

    const textResponses = await this.#extractTextDataFromQueryResponses({
      queryResponses: [queryResponse],
    });

    return textResponses;
  };

  queryKnowledgeByVectorRefId = async ({
    vectorRefId,
  }: {
    vectorRefId: string;
  }) => {
    const vectorRef = await this.prisma.knowledgeVectorRef.findUnique({
      where: {
        id: vectorRefId,
      },
      select: {
        knowledge: {
          select: {
            id: true,
            indexName: true,
            FK_workspaceId: true,
          },
        },
      },
    });

    if (!vectorRef) {
      throw new NotFoundException('Vector reference not found');
    }

    const queryResponse = await this.pineconeService.queryById({
      indexName: vectorRef.knowledge.indexName,
      workspaceId: vectorRef.knowledge.FK_workspaceId,
      vectorRefId,
      knowledgeId: vectorRef.knowledge.id,
    });

    //Extract text data from query responses
    const textResponses = await this.#extractTextDataFromQueryResponses({
      queryResponses: [queryResponse],
    });

    return textResponses;
  };

  saveUploadedTextToKnowledge = async ({
    data,
    knowledgeId,
    workspaceId,
  }: {
    data: SaveUploadedTextToKnowledgeDto;
    knowledgeId: string;
    workspaceId: string;
  }) => {
    const knowledge = await this.findOne({
      knowledgeId,
      expansion: {
        indexName: true,
        project: true,
        embeddingModel: true,
        embeddingProvider: true,
        dimensions: true,
      },
    });

    const chunks = this.#chunkText({
      text: data.text,
      chunkSize: data.chunkSize,
      chunkOverlap: data.chunkOverlap,
    });

    const usageType = this.credits.getUsageTypeFromEmbeddingModel({
      model: knowledge.embeddingModel as any,
    });

    const creditsRequired = this.credits.transformCostToCredits({
      usageType,
      data: {
        numEmbeddings: chunks.length,
      },
    });

    await this.credits.checkIfWorkspaceHasEnoughCredits({
      usageType,
      workspaceId,
      overrideMinimumRequired: creditsRequired,
    });

    if (chunks.length === 0) {
      throw new Error('No text found');
    } else if (chunks.length > 1) {
      //If there are multiple chunks, we'll save them as a group
      const newVectorRefGroup =
        await this.prisma.knowledgeVectorRefGroup.create({
          data: {},
          select: {
            id: true,
          },
        });

      await Promise.all(
        chunks.map(async (chunk, index) => {
          //We'll charge a credit for every 10 chunks
          if (index % 10 === 0) {
            await this.credits.updateWorkspaceCredits({
              workspaceId,
              creditsUsed: 1,
              projectId: knowledge.project?.id,
              data: {
                ref: {
                  knowledgeId,
                },
                details: {
                  reason: 'uploading knowledge',
                  chunks: chunks.length,
                },
              },
            });
          }

          return this.saveTextChunk({
            name: data.name,
            text: chunk,
            knowledgeId,
            vectorRefGroupId: newVectorRefGroup.id,
            workspaceId,
            part: index + 1,
            isMultiPart: true,
            indexName: knowledge.indexName,
            projectId: knowledge.project?.id,
            embeddingModel: knowledge.embeddingModel,
            embeddingProvider: knowledge.embeddingProvider as AiProvider,
            requestedDimensionSize: knowledge.dimensions,
          });
        }),
      );
    } else {
      await this.saveTextChunk({
        name: data.name,
        text: chunks[0],
        knowledgeId,
        vectorRefGroupId: null,
        workspaceId,
        part: 1,
        isMultiPart: false,
        indexName: knowledge.indexName,
        projectId: knowledge.project?.id,
        embeddingModel: knowledge.embeddingModel,
        embeddingProvider: knowledge.embeddingProvider as AiProvider,
        requestedDimensionSize: knowledge.dimensions,
      });

      await this.credits.updateWorkspaceCredits({
        creditsUsed: creditsRequired,
        workspaceId,
        projectId: knowledge.project?.id,
        data: {
          ref: {
            knowledgeId,
          },
          details: {
            reason: 'uploading knowledge',
            chunks: 1,
          },
        },
      });
    }

    return true;
  };

  saveTextChunk = async ({
    name,
    text,
    knowledgeId,
    vectorRefGroupId,
    workspaceId,
    part,
    isMultiPart,
    indexName,
    projectId,
    embeddingModel,
    embeddingProvider,
    requestedDimensionSize,
  }: {
    name: string;
    text: string;
    knowledgeId: string;
    embeddingModel: string;
    embeddingProvider: AiProvider;
    requestedDimensionSize: number;
    vectorRefGroupId: string | null;
    workspaceId: string;
    part: number;
    isMultiPart: boolean;
    indexName: string;
    projectId: string;
  }) => {
    let nameWithPart = isMultiPart ? `${name} (${part})` : name;
    if (nameWithPart.length > 100) {
      nameWithPart = nameWithPart.substring(0, 97) + '...';
    }

    const newVectorRef = await this.prisma.knowledgeVectorRef.create({
      data: {
        name: nameWithPart,
        FK_knowledgeId: knowledgeId,
        FK_knowledgeVectorRefGroupId: vectorRefGroupId,
        // s3Link: s3Link, //We'll update this after we upload to s3 because we need this newVectorRef.id to make the s3 path
        part: isMultiPart ? part : null,
      },
      select: {
        id: true,
      },
    });

    const filePath = `workspaces/${workspaceId}/knowledge/${knowledgeId}/vectorRefs/${newVectorRef.id}/data.txt`;

    await this.s3Manager.uploadTextFile({
      filePath,
      textContent: text,
    });

    //Update vector ref with s3 link
    await this.prisma.knowledgeVectorRef.update({
      where: {
        id: newVectorRef.id,
      },
      data: {
        s3Link: filePath,
      },
      select: {
        id: true,
      },
    });

    const embeddingProviderClient =
      this.aiProviders.getAiEmbeddingProviderClient({
        aiProvider: embeddingProvider as AiProvider,
        embeddingModel: embeddingModel,
        llmConnection: undefined,
        requestedDimensionSize: requestedDimensionSize,
        workspaceId,
      });

    const embeddingResponse = await embeddingProviderClient.doEmbed({
      values: [text],
    });

    //Upsert embedding to pinecone
    await this.pineconeService.upsert({
      newVectorId: newVectorRef.id,
      indexName: indexName,
      knowledgeId,
      workspaceId: workspaceId,
      projectId: projectId,
      s3Link: filePath,
      embedding: embeddingResponse.embeddings.flatMap((d) => d),
    });

    return true;
  };

  #chunkText = ({
    text,
    chunkSize = 1000,
    chunkOverlap = 100,
  }: {
    text: string;
    chunkSize: number; // in number of words
    chunkOverlap: number; // in number of words
  }) => {
    //This is super inefficient, but it's the only way to chunk text by words
    //We might make this a lambda function in the future to take this stress off the server.

    const words = text.split(' '); // Split the text into words
    const chunks = [];
    let i = 0;

    while (i < words.length) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push(chunk);
      i += chunkSize - chunkOverlap;
    }

    return chunks;
  };

  findAllVectorRefsForKnowledge = async ({
    knowledgeId,
  }: {
    knowledgeId: string;
  }) => {
    return this.prisma.knowledgeVectorRef.findMany({
      where: {
        FK_knowledgeId: knowledgeId,
      },
      select: {
        name: true,
        createdAt: true,
        id: true,
        part: true,
        s3Link: true,
      },
      orderBy: [
        { createdAt: 'desc' },
        {
          part: 'asc',
        },
      ],
    });
  };

  deleteVectorRef = async ({
    vectorRefId,
    knowledgeId,
    skipPineconeDeletion,
  }: {
    vectorRefId: string;
    knowledgeId: string;
    /**
     * This is incase you want to delete pinecone as a batch somewhere else
     */
    skipPineconeDeletion?: boolean;
  }) => {
    const vectorRef = await this.prisma.knowledgeVectorRef.findFirst({
      where: {
        AND: [
          {
            id: vectorRefId,
          },
          {
            FK_knowledgeId: knowledgeId,
          },
        ],
      },
      select: {
        id: true,
        s3Link: true,
        knowledge: {
          select: {
            indexName: true,
            FK_workspaceId: true,
          },
        },
      },
    });

    if (!vectorRef) {
      throw new NotFoundException('Vector reference not found');
    }

    if (vectorRef.s3Link) {
      //We delete the s3 link because it doesn't have it's own crud endpoints.
      //it only exists as a reference to the vector ref.
      await this.s3Manager.deleteFile(vectorRef.s3Link);
    }

    if (!skipPineconeDeletion) {
      await this.pineconeService.deleteMany({
        workspaceId: vectorRef.knowledge.FK_workspaceId,
        indexName: vectorRef.knowledge.indexName,
        idsToDelete: [vectorRefId],
      });
    }

    return await this.prisma.knowledgeVectorRef.delete({
      where: {
        id: vectorRefId,
      },
    });
  };

  deleteVectorRefGroupByVectorRefId = async ({
    vectorRefId,
    knowledgeId,
  }: {
    vectorRefId: string;
    knowledgeId: string;
  }) => {
    //Get all vector ref groups in the same group
    const vectorRefGroupWithRefs =
      await this.prisma.knowledgeVectorRefGroup.findFirst({
        where: {
          vectorRefs: {
            some: {
              id: vectorRefId,
            },
          },
        },
        select: {
          vectorRefs: {
            select: {
              id: true,
              knowledge: {
                select: {
                  FK_workspaceId: true,
                  indexName: true,
                },
              },
            },
          },
        },
      });

    if (!vectorRefGroupWithRefs) {
      //The client isn't waiting for a response, so we'll just return
      throw new NotFoundException('Vector reference group not found');
    }

    if (vectorRefGroupWithRefs.vectorRefs.length) {
      await Promise.all(
        vectorRefGroupWithRefs.vectorRefs.map(async (vectorRef) => {
          //This will handle deleting s3 links and raw text entries and other cleanup
          //We will skip pine cone deletion so we can do it in bulk after this loop
          return await this.deleteVectorRef({
            vectorRefId: vectorRef.id,
            knowledgeId,
            skipPineconeDeletion: true,
          });
        }),
      );

      await this.pineconeService.deleteMany({
        workspaceId:
          vectorRefGroupWithRefs.vectorRefs[0].knowledge.FK_workspaceId,
        indexName: vectorRefGroupWithRefs.vectorRefs[0].knowledge.indexName,
        idsToDelete: vectorRefGroupWithRefs.vectorRefs.map((ref) => ref.id),
      });

      return true;
    } else {
      return true;
    }
  };

  async checkWorkspaceUserHasAccessToKnowledge({
    workspaceId,
    workspaceUserId,
    knowledgeId,
  }: {
    workspaceId: string;
    workspaceUserId: string;
    knowledgeId: string;
  }) {
    const knowledge = await this.prisma.knowledge.findFirst({
      where: {
        AND: [
          {
            id: knowledgeId,
          },
          {
            FK_workspaceId: workspaceId,
          },
        ],
      },
      select: {
        project: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!knowledge?.project) {
      //If the knowledge does not belong to a project,
      //then it belongs to the workspace.
      return true;
    } else {
      const userBelongsToProject = await this.prisma.project.findFirst({
        where: {
          AND: [
            {
              id: knowledge.project?.id,
            },
            {
              workspaceUsers: {
                some: {
                  id: workspaceUserId,
                },
              },
            },
          ],
        },
      });

      return !!userBelongsToProject;
    }
  }

  async checkWorkspaceUserHasAccessToVectorRef({
    workspaceId,
    workspaceUserId,
    vectorRefId,
  }: {
    workspaceId: string;
    workspaceUserId: string;
    vectorRefId: string;
  }) {
    const vectorRef = await this.prisma.knowledgeVectorRef.findUnique({
      where: {
        id: vectorRefId,
      },
      select: {
        knowledge: {
          select: {
            id: true,
          },
        },
      },
    });

    return await this.checkWorkspaceUserHasAccessToKnowledge({
      workspaceId,
      workspaceUserId,
      knowledgeId: vectorRef.knowledge.id,
    });
  }

  /**
   * Knowledge belongs to workspace maintainer and/or the project maintainer
   *
   * If the knowledge belongs to a project, then the workspace maintainer or project maintainer has access
   * If the knowledge only belongs to the workspace, then the workspace maintainer has access
   */
  async checkKnowledgeBelongsToWorkspaceUser({
    workspaceId,
    workspaceUserId,
    knowledgeId,
  }: {
    workspaceId: string;
    workspaceUserId: string;
    knowledgeId: string;
  }) {
    const knowledge = await this.prisma.knowledge.findFirst({
      where: {
        AND: [
          {
            id: knowledgeId,
          },
          {
            FK_workspaceId: workspaceId,
          },
        ],
      },
      select: {
        project: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!knowledge) {
      throw new NotFoundException('Knowledge not found');
    }

    if (knowledge.project) {
      //Currently we have no project roles, so if you have access to the project, you can modify the knowledge.
      const userBelongsToProject = await this.prisma.project.findFirst({
        where: {
          AND: [
            {
              id: knowledge.project?.id,
            },
            {
              workspaceUsers: {
                some: {
                  id: workspaceUserId,
                },
              },
            },
          ],
        },
      });

      return !!userBelongsToProject;
    } else {
      //If varible does not belong to a project, then it belongs to the workspace.
      //Only workspace maintainers can modify workspace knowledge.
      const userBelongsToWorkspace = await this.prisma.workspaceUser.findFirst({
        where: {
          AND: [
            {
              FK_workspaceId: workspaceId,
            },
            {
              id: workspaceUserId,
            },
            {
              roles: {
                has: 'MAINTAINER',
              },
            },
          ],
        },
      });

      return !!userBelongsToWorkspace;
    }
  }

  /**
   * Knowledge vector ref belongs to workspace maintainer and/or the project maintainer
   *
   * If the knowledge belongs to a project, then the workspace maintainer or project maintainer has access
   * If the knowledge only belongs to the workspace, then the workspace maintainer has access
   */
  async checkKnowledgeVectorRefBelongsToWorkspaceUser({
    workspaceId,
    workspaceUserId,
    vectorRefId,
  }: {
    workspaceId: string;
    workspaceUserId: string;
    vectorRefId: string;
  }) {
    const vectorRef = await this.prisma.knowledgeVectorRef.findUnique({
      where: {
        id: vectorRefId,
      },
      select: {
        knowledge: {
          select: {
            id: true,
          },
        },
      },
    });

    return await this.checkKnowledgeBelongsToWorkspaceUser({
      workspaceId,
      workspaceUserId,
      knowledgeId: vectorRef.knowledge.id,
    });
  }

  #extractTextDataFromQueryResponses = async ({
    queryResponses,
  }: {
    queryResponses: QueryResponse<PineconeMetadata>[];
  }) => {
    const responseMetadatas = queryResponses
      .flatMap((response) => response.matches)
      .map((match) => match.metadata);

    //We'll extract the identifiers from metadata then deduplicate
    const s3Links: string[] = [];

    //We should always get matches, or else we have a bug
    const noMatches: PineconeMetadata[] = [];

    responseMetadatas.forEach((metadata) => {
      if (metadata.s3Link) {
        s3Links.push(metadata.s3Link);
      } else {
        noMatches.push(metadata);
      }
    });

    if (noMatches.length > 0) {
      throw new Error(
        `No known identifier found for some query responses: ${JSON.stringify(noMatches, null, 2)}`,
      );
    }

    const allTextResponses: string[] = [];

    /**
     * S3 LINKS
     *
     * fetch text from s3 links
     */
    const rawTextsFromS3 = await Promise.all(
      s3Links.map(async (s3Link) => {
        try {
          return await this.s3Manager.readTextFile({
            filePath: s3Link,
          });
        } catch {
          //File doesn't exist
          //Will filter out null below
          return null;
        }
      }),
    );

    rawTextsFromS3.filter(Boolean).forEach((text) => {
      allTextResponses.push(text);
    });

    /**
     * Return compiled text responses
     */
    return allTextResponses;
  };

  #checkKnowledgeLimitForWorkspacePlan = async ({
    workspaceId,
  }: {
    workspaceId: string;
  }) => {
    /**
     * free (Starter): 1 knowledge
     * professional: No limit
     * team: No limit
     * business: No limit
     */
    if (!this.credits.isBillingEnabled()) {
      return;
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      select: {
        _count: {
          select: {
            knowledge: true,
          },
        },
        billing: {
          select: {
            planType: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException(
        'Workspace not found to check knowledge limit',
      );
    }

    const numProjects: number = (workspace as any)._count.knowledge;

    //TODO: If someone downgrades plan, do we delete knowledge? Do we tell them they need to delete knowledge to downgrade?
    if (
      (!workspace.billing || workspace.billing.planType === 'free') &&
      numProjects >= 1
    ) {
      throw new ForbiddenException(
        'You have reached the knowledge notebook limit for your plan. Please upgrade your plan to add more.',
      );
    }
  };

  #validateChunkSizeAndOverlap = (
    data: CreateKnowledgeDto | { chunkSize?: number; chunkOverlap?: number },
  ) => {
    //nice resource https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-chunk-documents
    if (data.chunkSize != null || data.chunkOverlap != null) {
      if (data.chunkOverlap != null && data.chunkSize == null) {
        throw new Error('Chunk overlap cannot be set without chunk size');
      } else if (data.chunkSize != null && data.chunkOverlap == null) {
        throw new Error(
          'Chunk size cannot be set without chunk overlap. 10% of chunk size is recommended for the chunk overlap.',
        );
      } else if (data.chunkSize > 2000) {
        throw new Error('Chunk size cannot be greater 2000');
      } else if (data.chunkOverlap > data.chunkSize) {
        throw new Error('Chunk overlap cannot be greater than chunk size');
      } else if (data.chunkOverlap < 0 || data.chunkSize < 0) {
        throw new Error('Chunk size and overlap cannot be negative');
      } else if (data.chunkSize < 50) {
        throw new Error('Chunk size cannot be less than 50');
      }
      //Overlap can't be more than 50% of chunk size
      else if (data.chunkOverlap > data.chunkSize / 2) {
        throw new Error('Chunk overlap cannot be more than 50% of chunk size');
      }
    }
  };
}
