### Work on a feature

```sh
git checkout -b feature/foo
# ... (do some work)
git add .
git commit -m "..."
git push -u origin feature/foo
```

### Merge a feature branch into develop

```sh
rush change
git add .
git commit -m  "Generated changelogs for feature/foo"
git push
git rebase -i develop # Squash to a single commit
git checkout develop
git merge feature/foo
git branch -D feature/foo # Can restore with full history from origin/feature/foo if necessary.
```

### Bump version on develop

```sh
rush version --bump
git add .
git commit -m "Bump version"
git push
```

### Release from master

```sh
git checkout master
git merge develop
git push
```