---
name: deploy-preview-to-main
description: Workflow to merge the preview branch into main and push the changes to production.
---

# Deploy Preview to Main

This skill automates the process of merging changes from the `preview` branch into the `main` branch and pushing them to the remote repository. This constitutes a deployment to production in this project.

## Workflow Steps

1.  **Ensure Clean State**: Check that the working tree is clean.

    ```bash
    git status
    ```

2.  **Checkout Main**: Switch to the `main` branch and pull the latest changes to ensure it is up-to-date.

    ```bash
    git checkout main && git pull origin main
    ```

3.  **Merge Preview**: Merge the `preview` branch into `main`.

    ```bash
    git merge preview
    ```

4.  **Push to Production**: Push the updated `main` branch to the remote repository.

    ```bash
    git push origin main
    ```

5.  **Return to Preview**: Switch back to the `preview` branch to continue development.
    ```bash
    git checkout preview
    ```

## Usage

Use this skill whenever you are ready to deploy the current state of the `preview` branch to production.
