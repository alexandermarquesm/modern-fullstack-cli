#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";

// Helper to determine boilerplate location
// Assuming this script is running from ~/projects/scripts/index.js
// and boilerplate is at ~/projects/modern-fullstack-boilerplate
// But better to clone from GitHub as per user's preference now.
const REPO_URL =
  "https://github.com/alexandermarquesm/modern-fullstack-boilerplate.git";

program
  .name("modern-cli")
  .description("CLI for managing my projects")
  .version("1.0.0")
  .configureOutput({
    // Visually improved help output
    outputError: (str, write) => write(chalk.red(str)),
  })
  .addHelpText(
    "before",
    `
${chalk.bold.blue("🚀 Modern Fullstack CLI")} ${chalk.dim("v1.0.0")}
${chalk.dim("---------------------------------------------------")}
`,
  )
  .addHelpText(
    "after",
    `
${chalk.yellow("Examples:")}
  ${chalk.green("$ modern-cli create my-new-app")}
  ${chalk.green("$ modern-cli rename ~/projects/old-app new-app")}
  ${chalk.green("$ modern-cli install")} (Makes the CLI available globally)
`,
  );

// --- Install Command ---
program
  .command("install")
  .description("Install the CLI globally on your system")
  .action(() => {
    const spinner = ora("Installing modern-cli globally...").start();
    try {
      execSync("npm link --force", { stdio: "pipe" });
      spinner.succeed("Success! You can now use 'modern-cli' from any folder.");
      console.log(
        chalk.dim(
          "You might need to restart your terminal if it doesn't appear immediately.",
        ),
      );
    } catch (e) {
      spinner.fail("Failed to install globally.");
      console.error(chalk.red("\nError details:"));
      console.error(e.message);
      console.log(
        chalk.yellow("\nTry running with sudo if you have permission issues:"),
      );
      console.log(chalk.cyan("sudo npm link"));
    }
  });

// --- Create Command ---
program
  .command("create")
  .description("Create a new project from the boilerplate")
  .argument("[name]", "Name of the new project")
  .action(async (name) => {
    let projectName = name;

    if (!projectName) {
      const answer = await inquirer.prompt([
        {
          type: "input",
          name: "name",
          message: "What is the name of your new project?",
          validate: (input) =>
            /^[a-z0-9-_]+$/.test(input)
              ? true
              : "Use only lowercase letters, numbers, hyphens, and underscores.",
        },
      ]);
      projectName = answer.name;
    }

    const targetDir = path.resolve(process.cwd(), projectName);

    if (fs.existsSync(targetDir)) {
      console.log(chalk.red(`❌ Directory ${projectName} already exists.`));
      process.exit(1);
    }

    const spinner = ora(
      `Cloning boilerplate into ${chalk.cyan(projectName)}...`,
    ).start();

    try {
      execSync(`git clone ${REPO_URL} ${projectName}`, { stdio: "pipe" });
      spinner.succeed("Cloned repository.");
    } catch (e) {
      spinner.fail("Failed to clone repository.");
      console.error(e.message);
      process.exit(1);
    }

    spinner.start("Cleaning up git history...");
    try {
      await fs.remove(path.join(targetDir, ".git"));
      execSync("git init", { cwd: targetDir, stdio: "pipe" });
      spinner.succeed("Initialized new git repository.");
    } catch (e) {
      spinner.warn("Failed to reset git history.");
    }

    spinner.start("Renaming project files...");
    try {
      // Execute the internal rename logic directly here instead of calling the script?
      // Calling the script is safer to keep logic in one place if it updates.
      // But user wanted "external rename". Let's use our internal rename function for consistency.
      await renameProject(targetDir, projectName);
      spinner.succeed("Project renamed successfully.");
    } catch (e) {
      spinner.fail("Failed to rename project.");
      console.error(e);
    }

    console.log(
      chalk.green(`\n✅ Project ${projectName} created successfully!`),
    );
    console.log(
      `\nTo get started:\n  cd ${projectName}\n  pnpm install\n  pnpm dev`,
    );
  });

// --- Rename Command ---
program
  .command("rename")
  .description("Rename an existing project folder")
  .argument("<path>", "Path to the project folder")
  .argument("<newName>", "New project name")
  .action(async (projectPath, newName) => {
    const targetDir = path.resolve(process.cwd(), projectPath);

    if (!fs.existsSync(targetDir)) {
      console.log(chalk.red(`❌ Directory ${targetDir} does not exist.`));
      process.exit(1);
    }

    // Validate name
    if (!/^[a-z0-9-_]+$/.test(newName)) {
      console.log(
        chalk.red(
          "❌ Invalid name. Use only lowercase letters, numbers, hyphens, and underscores.",
        ),
      );
      process.exit(1);
    }

    const spinner = ora(
      `Renaming project at ${chalk.cyan(targetDir)} to ${chalk.green(newName)}...`,
    ).start();

    try {
      await renameProject(targetDir, newName);
      spinner.succeed("Project renamed successfully.");
      await renameProject(targetDir, newName);
      spinner.succeed("Project renamed successfully.");

      // Attempt to rename the folder itself
      if (path.resolve(targetDir) !== path.resolve(process.cwd())) {
        const newTargetDir = path.join(path.dirname(targetDir), newName);
        if (fs.existsSync(newTargetDir)) {
          console.log(
            chalk.yellow(
              `\n⚠️  Cannot rename folder: Directory "${newName}" already exists.`,
            ),
          );
        } else {
          await fs.rename(targetDir, newTargetDir);
          console.log(chalk.green(`\n✅ Folder renamed to: ${newName}`));
        }
      } else {
        console.log(
          chalk.yellow(
            "\n⚠️  Note: The folder name itself was not changed because you are currently inside it.",
          ),
        );
      }
    } catch (e) {
      spinner.fail("Failed to rename project.");
      console.error(e);
    }
  });

program.parse();

// --- Shared Rename Logic ---
async function renameProject(rootDir, newName) {
  const packagesDir = path.join(rootDir, "packages");

  // 1. Detect current scope
  let currentScope = "repo"; // default fallback without @
  let currentScopeFull = "@repo";

  if (fs.existsSync(packagesDir)) {
    const packages = await fs.readdir(packagesDir);
    for (const pkg of packages) {
      const pkgJsonPath = path.join(packagesDir, pkg, "package.json");
      if (fs.existsSync(pkgJsonPath)) {
        const data = await fs.readJson(pkgJsonPath);
        if (data.name.startsWith("@") && data.name.includes("/")) {
          currentScopeFull = data.name.split("/")[0]; // e.g., @my-app
          currentScope = currentScopeFull.substring(1);
          break;
        }
      }
    }
  }

  const oldScopeToken = `${currentScopeFull}/`;
  const newScopeToken = `@${newName}/`;

  // Update root package.json
  const rootPkgPath = path.join(rootDir, "package.json");
  if (fs.existsSync(rootPkgPath)) {
    const data = await fs.readJson(rootPkgPath);
    // Also update name if it matches the current scope name (often used in root)
    data.name = newName;
    await fs.writeJson(rootPkgPath, data, { spaces: 2 });
  }

  // Update packages
  if (fs.existsSync(packagesDir)) {
    const packages = await fs.readdir(packagesDir);
    for (const pkg of packages) {
      const pkgPath = path.join(packagesDir, pkg);
      const pkgJsonPath = path.join(pkgPath, "package.json");

      if (
        (await fs.stat(pkgPath)).isDirectory() &&
        fs.existsSync(pkgJsonPath)
      ) {
        const data = await fs.readJson(pkgJsonPath);

        // Update name
        if (data.name.startsWith(oldScopeToken)) {
          data.name = data.name.replace(oldScopeToken, newScopeToken);
        }

        // Update dependencies
        if (data.dependencies) {
          for (const dep of Object.keys(data.dependencies)) {
            if (dep.startsWith(oldScopeToken)) {
              const newDep = dep.replace(oldScopeToken, newScopeToken);
              data.dependencies[newDep] = data.dependencies[dep];
              delete data.dependencies[dep];
            }
          }
        }
        // Update devDependencies
        if (data.devDependencies) {
          for (const dep of Object.keys(data.devDependencies)) {
            if (dep.startsWith(oldScopeToken)) {
              const newDep = dep.replace(oldScopeToken, newScopeToken);
              data.devDependencies[newDep] = data.devDependencies[dep];
              delete data.devDependencies[dep];
            }
          }
        }

        await fs.writeJson(pkgJsonPath, data, { spaces: 2 });

        // Update Source files
        const srcDir = path.join(pkgPath, "src");
        if (fs.existsSync(srcDir)) {
          const files = await getFiles(srcDir);
          for (const file of files) {
            if (/\.(ts|tsx|js|jsx)$/.test(file)) {
              let content = await fs.readFile(file, "utf8");
              if (content.includes(oldScopeToken)) {
                content = content.split(oldScopeToken).join(newScopeToken);
                await fs.writeFile(file, content);
              }
              // Also replace explicit string references if needed (e.g. valid-project-name)
              // Naive check for boilerplate names
              if (content.includes("modern-fullstack-boilerplate")) {
                content = content.replace(
                  /modern-fullstack-boilerplate/g,
                  newName,
                );
                await fs.writeFile(file, content);
              }
            }
          }
        }
      }
    }
  }

  // Extra: Update README and HTML
  const extraFiles = [
    path.join(rootDir, "README.md"),
    path.join(rootDir, "packages/frontend/index.html"),
  ];

  for (const file of extraFiles) {
    if (fs.existsSync(file)) {
      let content = await fs.readFile(file, "utf8");
      const titleCase = newName
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      content = content.replace(/Modern Fullstack Boilerplate/g, titleCase);
      content = content.replace(/modern-fullstack-boilerplate/g, newName);
      await fs.writeFile(file, content);
    }
  }
}

async function getFiles(dir) {
  const subdirs = await fs.readdir(dir);
  const files = await Promise.all(
    subdirs.map(async (subdir) => {
      const res = path.resolve(dir, subdir);
      return (await fs.stat(res)).isDirectory() ? getFiles(res) : res;
    }),
  );
  return files.reduce((a, f) => a.concat(f), []);
}
