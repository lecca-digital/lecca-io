# Abandonment Messages

This module enables the creation and management of personalized abandonment text messages for marketing automation purposes. It integrates with A/B testing functionality to optimize message performance.

## Features

- **Text Builder**: Create personalized text templates with variables based on customer data
- **AI Template Generation**: Generate abandonment text templates using AI
- **Customer Segmentation**: Target messages based on customer behavior patterns
- **Personalization**: Use customer, cart, and browsing history data to personalize messages
- **A/B Testing**: Test different message variations to optimize performance

## Usage

### Creating a Template

1. Use the `Abandonment Text Builder` action to create a new template.
2. Enter a name, description, and message content with variables in `{{variable}}` format.
3. Test the template with sample data to see how personalization works.
4. Save the template for use in automations.

### Variables

The following personalization variables are available:

#### Customer Variables
- `{{firstName}}` - Customer's first name
- `{{lastName}}` - Customer's last name
- `{{email}}` - Customer's email address

#### Cart Variables
- `{{cartTotal}}` - Total value of items in cart
- `{{itemCount}}` - Number of items in cart
- `{{abandonedTime}}` - How long ago the cart was abandoned

#### Product Variables
- `{{productName}}` - Name of the main product in cart
- `{{productNames}}` - Names of all products in cart (formatted as a list)
- `{{productPrice}}` - Price of the main product in cart

#### Order Variables
- `{{lastOrderDate}}` - Date of customer's last completed order
- `{{lastOrderTotal}}` - Total value of customer's last completed order

### Using Formatters

You can format variables using the following syntax: `{{variable:formatter}}`

Available formatters:
- `currency` - Format as currency (e.g., `{{cartTotal:currency}}` or `{{cartTotal:currency(USD)}}`)
- `date` - Format as date (e.g., `{{lastOrderDate:date}}`)
- `list` - Format an array as a comma-separated list (e.g., `{{productNames:list}}`)
- `timeAgo` - Format a date as relative time (e.g., `{{abandonedAt:timeAgo}}`)

### A/B Testing

1. Create two or more template variations.
2. Use the A/B testing feature to set up a test between templates.
3. Configure the test duration and traffic split.
4. Review performance metrics to determine the winning template.

## Integration with Automations

Example workflow for abandoned cart recovery:

1. Trigger on cart abandonment (from e-commerce system webhook)
2. Wait 30 minutes
3. Check if cart is still abandoned
4. Get appropriate message template or A/B test
5. Send personalized abandonment message
6. Wait 4 hours
7. Check if cart is still abandoned
8. If still abandoned, send follow-up message with stronger incentive
9. Track conversions and message performance

## Best Practices

1. **Keep messages concise**: SMS messages should be clear and to the point.
2. **Include a clear CTA**: Make it obvious what action you want the customer to take.
3. **Personalize thoughtfully**: Use personalization to make messages relevant, not creepy.
4. **Test different approaches**: Use A/B testing to find what works best for your audience.
5. **Consider timing**: Send messages at appropriate times after abandonment.
6. **Respect opt-outs**: Always include a way for customers to opt out.
7. **Track performance**: Monitor conversion rates and adjust your approach as needed.

## Examples

### Cart Abandonment Template

```
Hi {{firstName}}, we noticed you left {{productName}} in your cart {{abandonedTime}}. Complete your purchase now and get free shipping!
```

### Product Browse Abandonment Template

```
Hi {{firstName}}, still thinking about {{productName}}? It's getting a lot of attention lately. Take another look before it sells out!
```

### Wishlist Reminder Template

```
Hi {{firstName}}, {{productName}} from your wishlist is now back in stock! Grab it before it's gone again.
```