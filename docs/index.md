# OnePager Management

Automating parts of the OnePager process - a monorepo containing sub-projects around automating the OnePager workflow.

## 🚀 [OnePager Web App](./app/)

Interactive web application for creating and managing OnePagers built with React, Vite, and TailwindCSS.

## 📖 Documentation

- **[Getting Started](./01-getting-started/)** - Learn how to set up and use the OnePager Management system
- **[Development Guide](./02-development/)** - Technical documentation for developers working on the project  
- **[Refactoring Plan](./03-refactoring-plan/)** - Detailed plan for ongoing system improvements and refactoring

## About OnePagers

OnePagers are documents similar to CVs that the company uses to promote employees to customers. A OnePager contains:

- Name and Position
- Photo
- Short list of skills and focus areas
- Work experience (including university) and certifications
- List of projects

The OnePagers are currently PowerPoint files stored on SharePoint. These sub-projects aim at automating working with the existing documents and also replacing them with new data collection methods and document generation.

## Repository Structure

- **`onepager-web/`** - Vite + React + TailwindCSS web application
- **`azure-functions/`** - Azure Functions backend services
- **`photo-classifier/`** - Python-based photo quality classification
- **`docs/`** - Documentation and GitHub Pages content
