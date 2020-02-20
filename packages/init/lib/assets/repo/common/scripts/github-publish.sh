#!/usr/bin/env node

VERSION = $1
OWNER = $2

git checkout -b "publish/$VERSION"
rush change --no-fetch -b publish/current --overwrite --bulk --bump-type patch --message "Update to version $VERSION"
rush version --bump
rush publish --include-all --publish --add-commit-details --apply --registry "https://npm.pkg.github.com/$OWNER"
git add .
git commit -am "Bump version to $VERSION"
git tag -f publish/current
git push -u origin "publish/$VERSION"
git checkout master
git merge publish/current
