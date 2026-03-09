# Contributing to DevNote Frontend

Thank you for your interest in contributing to DevNote Frontend! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- Be respectful and inclusive
- Exercise empathy and kindness
- Give and gracefully accept constructive feedback
- Focus on what is best for the community

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear and descriptive title**
- **Steps to reproduce** the problem
- **Expected vs actual behavior**
- **Screenshots** if applicable
- **Environment details** (browser, OS, Node version)
- **Console errors** if any

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Include:

- **Clear and descriptive title**
- **Detailed description** of the enhancement
- **Use cases** and benefits
- **Mockups or examples** if applicable

### Pull Requests

1. **Fork the repository** and create a branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes** following our standards
4. **Add/update tests** as needed
5. **Ensure tests pass**: `npm test`
6. **Update documentation**
7. **Create pull request** with clear description

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- DevNote Backend running locally

### Getting Started

```bash
# Clone your fork
git clone https://github.com/your-username/devnote-frontend.git
cd devnote-frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Development Server

```bash
npm run dev          # Start with hot reload
npm run build        # Production build
npm run preview      # Preview production build
```

## Code Style

### Linting and Formatting

```bash
# Lint code
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### TypeScript Guidelines

- Use TypeScript for all new code
- Avoid `any` type - use proper types or `unknown`
- Use type inference where possible
- Define interfaces for complex objects
- Use generics for reusable components

```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

const getUser = async (id: string): Promise<User> => {
  // Implementation
};

// Avoid
const getUser = async (id: any): Promise<any> => {
  // Implementation
};
```

### React Best Practices

- Use functional components with hooks
- Keep components small and focused
- Use custom hooks for shared logic
- Memoize expensive computations
- Handle loading and error states

```typescript
// Good component structure
export function MyComponent({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId)
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return null;

  return <div>{/* Component content */}</div>;
}
```

### Styling Guidelines

- Use Tailwind utility classes
- Follow mobile-first approach
- Use semantic class names
- Extract repeated patterns to components
- Use `clsx` for conditional classes

```typescript
import { clsx } from 'clsx';

function Button({ variant, children }: ButtonProps) {
  return (
    <button
      className={clsx(
        'px-4 py-2 rounded transition',
        variant === 'primary' && 'bg-blue-500 text-white',
        variant === 'secondary' && 'bg-gray-200 text-gray-800'
      )}
    >
      {children}
    </button>
  );
}
```

## Project Structure

```
src/
├── api/                 # API client and types
│   ├── client.ts       # Axios instance
│   ├── notes.ts        # API calls
│   └── types.ts        # API types
├── ui/                 # React components
│   ├── auth/           # Authentication
│   ├── editor/         # Editor components
│   ├── navigation/     # Navigation
│   └── toolbar/        # Toolbar
├── store/              # State management
│   ├── auth.ts         # Auth state
│   └── selection.ts    # UI state
├── lib/                # Utilities
└── main.tsx            # Entry point
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests once
npm run test:run

# Run with coverage
npm test -- --coverage
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    await user.click(screen.getByRole('button'));
    
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Testing Guidelines

- Test user interactions, not implementation
- Use semantic queries (getByRole, getByLabelText)
- Test loading and error states
- Mock API calls and external dependencies
- Keep tests focused and independent

## State Management

### React Query

Use TanStack Query for server state:

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

// Queries
const { data, isLoading } = useQuery({
  queryKey: queryKeys.page(pageId),
  queryFn: () => fetchPage(pageId)
});

// Mutations
const mutation = useMutation({
  mutationFn: createPage,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pages() });
  }
});
```

### Zustand

Use Zustand for UI/client state:

```typescript
import { create } from 'zustand';

interface Store {
  count: number;
  increment: () => void;
}

export const useStore = create<Store>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}));
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (not CSS)
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

**Examples:**
```
feat(editor): add markdown shortcuts
fix(auth): resolve token refresh issue
docs(readme): update setup instructions
style(navigation): improve folder list styling
```

## Adding New Features

### 1. UI Components

Create components in `src/ui/`:

```typescript
// src/ui/MyFeature/MyComponent.tsx
import { useState } from 'react';

interface MyComponentProps {
  title: string;
  onSave?: (data: string) => void;
}

export function MyComponent({ title, onSave }: MyComponentProps) {
  const [value, setValue] = useState('');

  return (
    <div>
      <h2>{title}</h2>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <button onClick={() => onSave?.(value)}>Save</button>
    </div>
  );
}
```

### 2. API Integration

Add API calls in `src/api/`:

```typescript
// src/api/myFeature.ts
import { api } from './client';

export interface MyData {
  id: string;
  name: string;
}

export const myFeatureApi = {
  list: () => api.get<MyData[]>('/api/my-feature'),
  get: (id: string) => api.get<MyData>(`/api/my-feature/${id}`),
  create: (data: Partial<MyData>) => api.post<MyData>('/api/my-feature', data)
};
```

### 3. Add to Router

Update `src/router.tsx` if adding new routes.

## Accessibility

- Use semantic HTML elements
- Add ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers
- Maintain sufficient color contrast

```typescript
// Good
<button aria-label="Close dialog" onClick={onClose}>
  <XIcon />
</button>

<input
  type="text"
  aria-label="Search notes"
  placeholder="Search..."
/>
```

## Performance

- Lazy load heavy components
- Memoize expensive computations
- Optimize re-renders with React.memo
- Use virtual scrolling for long lists
- Optimize images and assets

```typescript
// Lazy loading
const ExcalidrawEditor = lazy(() => import('./ExcalidrawEditor'));

// Memoization
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Prevent re-renders
const MemoizedComponent = memo(MyComponent);
```

## Documentation

- Update README for user-facing changes
- Add JSDoc comments for complex logic
- Document component props with TypeScript
- Update examples and guides

## Getting Help

- Check existing issues and discussions
- Ask questions in GitHub Discussions
- Review existing code for patterns

## Pull Request Process

1. Update documentation
2. Add tests for new features
3. Ensure all tests pass
4. Update the CHANGELOG if applicable
5. Request review from maintainers
6. Address review feedback

## Recognition

Contributors are recognized in:
- GitHub contributors list
- Release notes
- Special mentions for significant work

Thank you for contributing! 🎉
