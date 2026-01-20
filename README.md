
![Kindle Importer Plus Art](https://github.com/user-attachments/assets/ae191c80-0608-4d91-883d-b745483f80c2)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/ducktapekiller)

Imagine you use a plugin to generate a book note, populate the frontmatter, and capture the cover art. How do you import your Kindle highlights into that specific note instead of creating a duplicate?

Kindle Importer Plus is a powerful, highly-customisable plugin for Obsidian that imports Kindle highlights from the HTML files exported by the Kindle app directly into existing notes. By specifying your book notes folder, the plugin matches the Kindle export to the note with the corresponding title.

Example:

1. Use the [Book Search Plus](https://github.com/DuckTapeKiller/obsidian-book-search-plus) plugin to create a note for "The Trial" by Franz Kafka, complete with frontmatter and cover imagery.
2. While reading, record your highlights on your Kindle.
3. Once finished, export the HTML file from the Kindle app and upload it to "Kindle Importer Plus".
4. The plugin identifies the note titled "The Trial" and appends the highlights to the end of the file. This ensures your existing content—such as personal reviews or summaries—remains untouched; the plugin only adds data to the bottom of the note.

Alternatively, if you prefer the plugin to generate new notes for each export, you can enable this behaviour in the settings.

This plugin is based on and extends the functionality of [kindle_html_importer](https://github.com/l2xu/kindle_html_importer) by **l2xu**.

## ✨ Key Features

* **Smart "Append-First" Logic**: The plugin searches your vault for an existing note matching the book title (case-insensitive). If found, it appends your new highlights to the bottom. It only creates a new file if you explicitly allow it.
* **Color-Coded Callouts**: Map your Kindle highlight colors (Yellow, Blue, Pink, Orange) to specific Obsidian Callouts.
    * *Example*: Make **Yellow** highlights appear as standard `> [!quote]` and **Blue** highlights as `> [!todo]`.
* **Monochromatic Kindle Support**: Fully supports standard black-and-white Kindles using the "Default / Yellow" mapping.
* **Nested User Notes**: Your personal notes are neatly nested *inside* the highlight callout, keeping the context clear.
* **Deep Customization**:
    * **Custom Note Labels**: Change "Note" to "Nota", "Comment", or anything else.
    * **Text Styling**: Choose whether your notes appear in **Bold**, *Italic*, or Normal text.
    * **Custom Headers**: Rename the "Imported Highlights" section and toggle the date stamp.
* **Advanced File Creation**:
    * **Custom Frontmatter Templates**: Define exactly how new notes should look using flexible placeholders (e.g., `{{title}}`, `{{author}}`, `{{tags}}`).
    * **Tag Injection**: Automatically inject specific tags (like `#kindle`) into the frontmatter of *existing* notes when you import new highlights.

## 🚀 How to Use

1.  **Export from Kindle**:
    * Open the Kindle App (Mobile or Desktop).
    * Go to a book, select "Notebook" (or Notes & Highlights).
    * Choose **Export Notebook** -> **Export as HTML**.
2.  **Import to Obsidian**:
    * Click the **"K" icon** in the Obsidian Ribbon (left sidebar).
    * (Or use the command palette: `Kindle Highlights Importer Plus: Import Highlights`).
    * Select the `.html` file you just exported.
3.  **Done!**
    * The plugin will find your book note and append the highlights.
    * If the note isn't found (and "Create New Notes" is enabled), a new one will be created for you.

## ⚙️ Settings Guide

### Book Folder
* **Book Folder**: Select the folder where you keep your book notes. The plugin looks here first to find matches.

### File Creation
* **Create New Notes**: Toggle this **ON** if you want the plugin to generate a new markdown file when it can't find an existing one.
* **Include Frontmatter**: If creating a new file, should it include YAML frontmatter?
* **Frontmatter Template**: (Visible if above is ON). Customize your metadata.
    * **Supported Placeholders**:
        * `{{title}}`: Book Title
        * `{{author}}`: Author Name
        * `{{publisher}}`: Publisher Name
        * `{{highlightsCount}}`: Total number of highlights imported
        * `{{date}}`: Today's date (YYYY-MM-DD)
        * `{{tags}}`: A generated list of tags (Kindle, Author, Title + your custom tags)

### Tag Injection
* **Add Tags to Existing Notes**: If enabled, the plugin will look at the existing note's frontmatter and add the tags you specify below (without duplicating them).
* **Tags to Add**: A comma-separated list of tags (e.g., `kindle, reading-log`).

### Import Configuration
* **Header Title**: The heading text for the new section (Default: "Imported Highlights").
* **Include Date in Header**: Adds `(2026-01-10)` next to the header title.

### Note Customization
* **Note Label**: The text that precedes your personal notes.
    * *Default*: `Note` -> `> **Note**: My thoughts...`
    * *Custom*: `Comentario` -> `> **Comentario**: My thoughts...`
* **Note Text Style**: Choose between **Normal**, ***Italic***, or **Bold** for your note content.

### Callout Mappings
This is where the magic happens. You can map the 4 Kindle highlight colors to any Obsidian Callout type.

* **Default / Yellow Highlights**: Used for Yellow highlights AND all highlights from black-and-white Kindles.
* **Blue / Pink / Orange**: Map these to other types like `info`, `todo`, `warning`, or `important`.
* **Custom Callouts**: Select "CUSTOM..." in the dropdown to type your own callout name (e.g., `vocabulary`, `character`).

**How to install:**

1. Navigate to the hidden ".obsidian" folder located at the root of your vault.
2. Open the "plugins" folder.
3. Create a new directory named "kindle-importer-plus".
4. Copy "main.js", "manifest.json", and "style.css" into this new folder.
5. Restart Obsidian or reload plugins to complete the installation.

---
**Author**: DuckTapeKiller
**License**: MIT
