# A/B Testing with Percentage Splits

The A/B Test action allows you to split traffic between multiple paths based on configurable percentages. This is useful for testing different variants of a workflow to determine which performs better.

## Features

- Split traffic between 2 or more variants based on configurable percentages
- Visual percentage slider for easy configuration
- Automatic percentage remaining calculation and distribution
- Validation to ensure percentages sum to 100%
- Support for any number of variants (2, 3, 4, 5, etc.)

## How to Use

1. Add the **A/B Test** action to your workflow
2. Connect it to two or more downstream nodes representing different variants
3. Configure the percentage split for each variant using the sliders or input fields
4. Ensure the total percentages add up to 100%

## Example Use Cases

### Simple A/B Test (50/50 split)

- Variant A: 50%
- Variant B: 50%

### Multi-variant Test (60/20/20 split)

- Control variant: 60%
- Test variant 1: 20%
- Test variant 2: 20%

### Gradual Rollout (90/10 split)

- Current implementation: 90%
- New implementation: 10%

## How It Works

The A/B Test action uses a random number generator to determine which path to take. It generates a random number between 0 and 100, and then selects the path based on the configured percentages.

For example, with a 70/30 split:
- If the random number is between 0-70, it will select the first path
- If the random number is between 70-100, it will select the second path

## Advanced Usage

### Adding/Removing Variants

You can add or remove variants at any time by connecting or disconnecting nodes from the A/B Test action. The UI will automatically update to show the connected variants.

### Archiving Variants

To archive a variant, simply disconnect it from the A/B Test action. The UI will no longer show it as an option.

### Saving Test Results

The results of A/B tests are captured in the execution data of your workflow. You can analyze this data to determine which variant performs better.

## Best Practices

1. **Start small**: Begin with a small percentage for new variants (10-20%)
2. **Monitor closely**: Watch performance metrics to ensure the new variant isn't causing issues
3. **Gradually increase**: If the new variant is performing well, gradually increase its percentage
4. **Statistical significance**: Run tests long enough to gather statistically significant data