# Email Templates

React email templates using @react-email/components.

## Overview

Email templates are React components that render to HTML for email clients.

## Development

Preview emails locally:

```bash
pnpm email
```

This starts the email dev server at http://localhost:3100

## Creating Templates

```typescript
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

interface WelcomeEmailProps {
  username: string;
}

export function WelcomeEmail({ username }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to our app!</Preview>
      <Body style={main}>
        <Container>
          <Heading>Welcome, {username}!</Heading>
          <Text>Thanks for signing up.</Text>
          <Button href="https://yourapp.com">Get Started</Button>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
};
```

## Available Components

- `Html` - Wrapper
- `Head` - Meta tags
- `Preview` - Preview text (inbox)
- `Body` - Email body
- `Container` - Content container
- `Heading` - Headings (h1-h6)
- `Text` - Paragraphs
- `Button` - Call-to-action buttons
- `Link` - Hyperlinks
- `Img` - Images
- `Hr` - Horizontal rules
- `Section` - Layout sections

## Sending Emails

Via email adapter in services:

```typescript
await this.deps.email.sendEmail({
  from: "noreply@example.com",
  to: user.email,
  subject: "Welcome!",
  body: <WelcomeEmail username={user.name} />,
});
```

## Testing

Test emails by sending to a development SMTP server:

```bash
# Using MailHog
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Set in .env
EMAIL_CONNECTION_URL=smtp://localhost:1025
```

Visit http://localhost:8025 to see caught emails.

## Best Practices

- **Inline styles**: Email clients don't support external CSS
- **Tables for layout**: Use `<Section>` and `<Container>` from react-email
- **Test across clients**: Gmail, Outlook, Apple Mail behave differently
- **Plain text fallback**: Consider providing a text version
- **Image hosting**: Host images on a CDN, not as attachments
- **Keep it simple**: Complex layouts often break in email clients

## Resources

- [React Email Documentation](https://react.email)
- [Email client support](https://www.caniemail.com)
