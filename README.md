# Modern Fullstack CLI

A powerful CLI tool for managing your web projects, designed to work with the Modern Fullstack Boilerplate.

## 🚀 Features

- **Create Projects**: Clone and setup a new project from the boilerplate with a single command.
- **Rename Projects**: Easily rename projects (including internal package names and references) and automatically rename the project folder if safe.
- **Global Installation**: Self-install command to make the CLI available system-wide.
- **Interactive UI**: Beautiful prompts, spinners, and colored output.

## 📦 Installation

To install the CLI globally on your machine:

1. Clone this repository.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Run the install command:
   ```bash
   ./index.js install
   ```

Now you can use `modern-cli` from anywhere!

## 🛠️ Usage

### Create a New Project

```bash
modern-cli create <project-name>
```

If you don't provide a name, the CLI will ask you for one.

### Rename an Existing Project

```bash
modern-cli rename <path/to/project> <new-name>
```

This command will:

- Update `package.json` names in root and packages.
- Update internal dependencies and imports.
- Rename the project folder (if not currently inside it).

### Help

See all available commands:

```bash
modern-cli --help
```

## 📝 License

MIT
