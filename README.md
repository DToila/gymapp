# GymApp - Modern Gym Membership Management System

A professional web application for managing gym memberships with separate portals for teachers and students.

## Features

- **Modern Dark Theme**: Professional dark-themed UI with modern design patterns
- **Dual Login System**: Separate login options for Teachers and Students
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Professional UI/UX**: Built with Tailwind CSS for a polished appearance
- **Type-Safe**: Built with TypeScript for better development experience

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development

### Project Structure

```
src/
├── app/                 # Next.js App Router directory
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
├── components/         # React components
│   └── Login.tsx       # Login component
```

### Building for Production

```bash
npm run build
npm start
```

## Technologies Used

- **Framework**: Next.js 14+ with React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Development**: ESLint for code quality

## Future Features

- Teacher Dashboard for class management
- Student Dashboard for viewing membership details
- Membership management system
- User authentication system
- Payment integration
- Reporting and analytics

## License

MIT License - feel free to use this project

## Support

For issues or questions, please contact support@gymapp.com
