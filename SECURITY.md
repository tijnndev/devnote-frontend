# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of DevNote Frontend seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please DO NOT:

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it has been addressed

### Please DO:

1. **Report via GitHub Security Advisories** (preferred method):
   - Go to the Security tab
   - Click "Report a vulnerability"
   - Fill out the form with details

2. **Report via email**:
   - Send details to: [tijnnotkamp@gmail.com]
   - Include "SECURITY" in the subject line

### What to Include:

- Description of the vulnerability
- Steps to reproduce the issue
- Affected browsers/platforms
- Potential impact
- Any suggested fixes (optional)
- Your name/handle for acknowledgment (optional)

### What to Expect:

- **Initial Response**: Within 48 hours
- **Status Update**: Within 5 business days
- **Fix Timeline**: Depends on severity
  - Critical: 1-7 days
  - High: 7-14 days
  - Medium: 14-30 days
  - Low: 30-90 days

## Security Best Practices

When using DevNote Frontend:

### 1. API Key Management
- Never hardcode API keys in the application code
- Use environment variables for API keys
- Don't commit `.env` files to version control
- Consider using secure token storage mechanisms

### 2. Authentication
- API keys are stored in localStorage (consider alternatives for production)
- Implement proper session timeout
- Clear authentication data on logout
- Consider using HttpOnly cookies for production

### 3. HTTPS
- Always serve the application over HTTPS in production
- Use HSTS headers
- Ensure all API calls use HTTPS

### 4. Content Security
- Review and configure Content Security Policy (CSP)
- Sanitize user inputs (React provides XSS protection)
- Be cautious with dangerouslySetInnerHTML
- Validate all data from the backend

### 5. Dependencies
- Regularly update dependencies: `npm audit fix`
- Monitor security advisories
- Use `npm audit` before deployment
- Consider automated tools like Dependabot

### 6. Build and Deployment
- Use secure CI/CD pipelines
- Don't expose source maps in production
- Minimize bundle size to reduce attack surface
- Use Subresource Integrity (SRI) for CDN assets

### 7. Browser Security
- Support modern, secure browsers
- Implement proper CORS handling
- Use secure headers (CSP, X-Frame-Options, etc.)
- Implement rate limiting on the client side

### 8. Data Protection
- Don't store sensitive data in localStorage
- Clear sensitive data from memory when done
- Implement proper error handling (don't leak info)

## Known Security Considerations

### localStorage Usage
- API keys are currently stored in localStorage
- Consider using sessionStorage for shorter sessions
- Evaluate HttpOnly cookies for production
- Implement auto-logout after inactivity

### Third-Party Dependencies

#### Excalidraw
- Large dependency, review security advisories
- Sanitize exported data
- Validate imported drawings

#### TipTap/ProseMirror
- Rich text editing has XSS risks
- Keep updated to latest versions
- Validate HTML content from server

#### React & Dependencies
- Keep React and all dependencies updated
- Monitor for security patches
- Use official packages only

### Client-Side Validation
- Never rely solely on client-side validation
- Always validate on the backend
- Sanitize inputs before sending to API

### Error Handling
- Don't expose sensitive information in errors
- Log errors securely
- Implement proper error boundaries
- Use generic error messages for users

## Security Headers

Recommended security headers for deployment:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Deployment Security Checklist

Before deploying to production:

- [ ] Remove development/debug code
- [ ] Set `NODE_ENV=production`
- [ ] Configure CSP headers
- [ ] Enable HTTPS/SSL
- [ ] Configure secure cookies (if applicable)
- [ ] Remove source maps (or protect them)
- [ ] Validate environment variables
- [ ] Test authentication flow
- [ ] Review CORS configuration
- [ ] Run security audit: `npm audit`
- [ ] Update all dependencies
- [ ] Test error handling
- [ ] Implement monitoring/logging
- [ ] Configure rate limiting
- [ ] Review third-party integrations

## Browser Support

DevNote Frontend supports modern browsers with security updates:

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)

We do not support:
- Internet Explorer
- Browsers without security updates
- Very old browser versions

## Disclosure Policy

- We will acknowledge your report within 48 hours
- We will provide a detailed response within 5 business days
- We will keep you informed about our progress
- Once resolved, we will publicly disclose (with your permission)
- We will credit you in the security advisory (if you wish)

## Security Updates

Security updates will be released as:
- Patch versions for minor security issues
- Minor versions for moderate security issues
- Major versions for breaking security changes

Subscribe to:
- GitHub Security Advisories
- Repository releases
- Security-only notifications

## Acknowledgments

We appreciate the security research community. Researchers who responsibly disclose vulnerabilities will be acknowledged in:

- Security advisories
- Release notes
- Credits section

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security Best Practices](https://react.dev/learn/keeping-components-pure)
- [Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)

## Contact

For security-related questions:
- GitHub Security Advisories: [Preferred]
- Email: [tijnnotkamp@gmail.com]

For general questions, use GitHub Discussions or Issues.

Thank you for helping keep DevNote secure!
