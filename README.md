# LiftEquip Loan Control — GitHub Pages

Static dashboard hosted by GitHub Pages. Data updates hourly through GitHub Actions from a public OneDrive Excel link.

## Setup
1. Create a new GitHub repo and push these files.
2. In GitHub: Settings → Pages → Source = `GitHub Actions` is not needed; use branch `main` / root, or keep default Pages from branch.
3. Repo → Settings → Secrets and variables → Actions → Variables → New repository variable:
   - Name: `ONEDRIVE_XLSX_URL`
   - Value: public OneDrive direct-download link to the `.xlsx`
4. Enable Actions, then run workflow **Update loan dashboard data** once manually.
5. Open `https://<user>.github.io/<repo>/`.

OneDrive link tip: use Share → Anyone with the link → Copy link, then convert it to a direct download link. If the download URL does not end in the file or `.xlsx`, test it in an incognito browser — it must download the workbook without login.

Note: anyone with the OneDrive link can access the Excel data. For private company data, switch the workflow to Microsoft Graph authentication instead.
