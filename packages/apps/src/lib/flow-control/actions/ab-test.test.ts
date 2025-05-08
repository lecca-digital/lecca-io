import { abTest } from './ab-test.action';

// Mock Math.random to return specific values for testing
const mockRandom = jest.spyOn(Math, 'random');

describe('A/B Test Action', () => {
  beforeEach(() => {
    mockRandom.mockReset();
  });

  test('should select the first path when random value is within first percentage range', async () => {
    mockRandom.mockReturnValue(0.25); // 25% of the way through
    
    const configValue = {
      abTestPaths: [
        { label: 'Variant A', pathId: 'path-1', percentage: 50 },
        { label: 'Variant B', pathId: 'path-2', percentage: 50 },
      ],
    };
    
    const result = await abTest.run({ configValue } as any);
    expect(result.pathsToTake).toEqual(['path-1']);
  });

  test('should select the second path when random value is above first percentage range', async () => {
    mockRandom.mockReturnValue(0.75); // 75% of the way through
    
    const configValue = {
      abTestPaths: [
        { label: 'Variant A', pathId: 'path-1', percentage: 50 },
        { label: 'Variant B', pathId: 'path-2', percentage: 50 },
      ],
    };
    
    const result = await abTest.run({ configValue } as any);
    expect(result.pathsToTake).toEqual(['path-2']);
  });

  test('should select the appropriate path in a multi-variant test', async () => {
    mockRandom.mockReturnValue(0.65); // 65% of the way through
    
    const configValue = {
      abTestPaths: [
        { label: 'Variant A', pathId: 'path-1', percentage: 30 },
        { label: 'Variant B', pathId: 'path-2', percentage: 30 },
        { label: 'Variant C', pathId: 'path-3', percentage: 40 },
      ],
    };
    
    const result = await abTest.run({ configValue } as any);
    expect(result.pathsToTake).toEqual(['path-3']);
  });

  test('should throw an error if percentages do not sum to 100', async () => {
    const configValue = {
      abTestPaths: [
        { label: 'Variant A', pathId: 'path-1', percentage: 40 },
        { label: 'Variant B', pathId: 'path-2', percentage: 40 },
      ],
    };
    
    await expect(abTest.run({ configValue } as any)).rejects.toThrow('Percentages must sum to 100%');
  });

  test('should throw an error if no paths are provided', async () => {
    const configValue = {
      abTestPaths: [],
    };
    
    await expect(abTest.run({ configValue } as any)).rejects.toThrow('No A/B test paths found');
  });
});