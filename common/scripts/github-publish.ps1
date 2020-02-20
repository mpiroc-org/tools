param(
    [Parameter(Mandatory=$true,ValueFromPipeline=$true,Position=0)]
    [string]$Version,
    [Parameter(Mandatory=$true,Position=1)]
    [string]$Owner,
    [Parameter(Mandatory=$false,Position=2)]
    [string]$RepoRoot="."
)

Invoke-Expression 'git checkout -b "publish/$Version"'
Invoke-Expression 'rush change --no-fetch -b publish/current --overwrite --bulk --bump-type patch --message "Update to version $Version"'
Invoke-Expression 'rush version --bump'
Invoke-Expression 'rush publish --include-all --publish --add-commit-details --apply --registry https://npm.pkg.github.com/$Owner'
Invoke-Expression 'git add $RepoRoot'
Invoke-Expression 'git commit -m "Bump version to $Version"'
Invoke-Expression 'git tag -f publish/current'
Invoke-Expression 'git push -u origin "publish/$Version"'
Invoke-Expression 'git checkout master'
Invoke-Expression 'git merge publish/current'
