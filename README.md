# DevNote Frontend

A modern, feature-rich note-taking application built with React, TypeScript, and Vite. DevNote combines powerful document editing with Excalidraw canvas support for the ultimate note-taking experience.

## ✨ Features

- 📝 **Rich Text Editor** - Powered by TipTap with markdown support
- 🎨 **Excalidraw Integration** - Create diagrams and drawings directly in your notes
- 📁 **Hierarchical Organization** - Organize notes in nested folders
- 🔍 **Fast Search** - Search across all your notes instantly
- 📌 **Pin & Archive** - Keep important notes at the top
- 💾 **Auto-save** - Never lose your work with automatic saving
- 📱 **Responsive Design** - Works beautifully on all devices
- 🎯 **Drag & Drop** - Reorder folders and notes easily
- 🔐 **API Key Authentication** - Secure access to your notes

## 🛠️ Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Full type safety
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first styling
- **TipTap** - Rich text editor
- **Excalidraw** - Canvas drawing
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **Axios** - HTTP client
- **React Router** - Client-side routing

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- DevNote Backend running (see [devnote-backend](https://github.com/tijnndev/devnote-backend))

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/tijnndev/devnote-frontend.git
cd devnote-frontend
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
VITE_API_KEY=your_secret_api_key
VITE_BACKEND_URL=http://localhost:8037
```

**Note:** The API key should match the one configured in your backend.

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📚 Usage

### First Time Setup

1. Open the application in your browser
2. Enter your API key (configured in the backend)
3. Start creating notes!

### Creating Notes

1. Click the "+" button to create a new folder or note
2. Select a folder in the navigation panel
3. Choose between Document (rich text) or Canvas (Excalidraw)
4. Start writing or drawing!

### Organizing Notes

- **Drag & Drop** - Reorder folders and notes in the navigation panel
- **Nested Folders** - Create folder hierarchies for better organization
- **Pin Notes** - Keep important notes at the top
- **Archive Notes** - Hide completed notes without deleting them

### Editor Features

#### Document Editor (TipTap)
- **Markdown shortcuts** - Use `#` for headings, `-` for lists, etc.
- **Formatting** - Bold, italic, underline, code, links
- **Lists** - Bullet lists, numbered lists, task lists
- **Code blocks** - Syntax highlighted code
- **Images** - Insert images directly
- **Keyboard shortcuts** - Standard text editing shortcuts

#### Canvas Editor (Excalidraw)
- **Drawing tools** - Rectangle, circle, arrow, line, text
- **Freehand drawing** - Sketch and annotate
- **Collaboration ready** - Export/import drawings
- **Rich styling** - Colors, stroke styles, fill patterns

## 🏗️ Project Structure

```
devnote-frontend/
├── src/
│   ├── api/               # API client and endpoints
│   │   ├── client.ts      # Axios configuration
│   │   ├── notes.ts       # Note-related API calls
│   │   └── types.ts       # TypeScript types
│   ├── lib/               # Utilities and helpers
│   │   └── queryKeys.ts   # React Query key factory
│   ├── store/             # Zustand state management
│   │   ├── auth.ts        # Authentication state
│   │   └── selection.ts   # UI selection state
│   ├── ui/                # React components
│   │   ├── auth/          # Authentication components
│   │   ├── editor/        # Editor panel
│   │   ├── navigation/    # Navigation panel
│   │   └── toolbar/       # Toolbar components
│   ├── main.tsx           # Application entry point
│   ├── router.tsx         # Route configuration
│   └── index.css          # Global styles
├── .env.example           # Example environment file
├── package.json
├── vite.config.ts         # Vite configuration
└── tailwind.config.cjs    # Tailwind configuration
```

## 🧪 Testing

```bash
# Run tests once
npm run test:run

# Run tests in watch mode
npm test
```

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Lint code
npm test         # Run tests in watch mode
npm run test:run # Run tests once
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_KEY` | API key for backend authentication | - |
| `VITE_BACKEND_URL` | Backend API URL | `http://localhost:4000` |

## 🚢 Production Build

### 1. Build the Application

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### 2. Deploy

Deploy the `dist/` folder to your preferred hosting service:

#### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

#### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Static Hosting (Nginx, Apache, etc.)
Simply upload the contents of `dist/` to your web server.

### 3. Environment Variables

Set production environment variables in your hosting platform:

```env
VITE_API_KEY=your_production_api_key
VITE_BACKEND_URL=https://your-backend-domain.com
```

## 🔒 Security

- API keys are stored in localStorage (consider using HttpOnly cookies for production)
- All API requests include authentication headers
- CORS is configured on the backend
- Input validation on all forms
- XSS protection through React's built-in escaping

## 🎨 Customization

### Theming

Edit `tailwind.config.cjs` to customize colors and styling:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#your-color',
        // Add custom colors
      }
    }
  }
}
```

### Editor Configuration

Customize the TipTap editor in `src/ui/editor/EditorPanel.tsx`:

```typescript
const editor = useEditor({
  extensions: [
    StarterKit,
    // Add or remove extensions
  ],
})
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Known Issues

- Canvas exports may have browser compatibility issues
- Large documents might experience performance issues (optimizations planned)

## 📮 Support

- Create an issue for bug reports or feature requests
- Check existing issues before creating new ones
- Provide as much context as possible in bug reports

## 🗺️ Roadmap

- [ ] Dark mode support
- [ ] Collaborative editing
- [ ] Mobile apps (iOS/Android)
- [ ] Plugin system
- [ ] Advanced search filters
- [ ] Export to PDF/Markdown
- [ ] Tags and labels
- [ ] Templates

## 🙏 Acknowledgments

- [TipTap](https://tiptap.dev/) - Excellent rich text editor
- [Excalidraw](https://excalidraw.com/) - Beautiful drawing library
- [TailwindCSS](https://tailwindcss.com/) - Amazing utility-first CSS
- [Vite](https://vitejs.dev/) - Lightning-fast build tool

## 🔗 Related Projects

- [DevNote Backend](https://github.com/tijnndev/devnote-backend) - Backend API for DevNote
