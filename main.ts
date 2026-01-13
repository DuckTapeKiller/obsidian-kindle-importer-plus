import { Plugin, Notice, App, PluginSettingTab, Setting, TFolder, Modal, TFile, addIcon } from "obsidian";
import * as cheerio from "cheerio";

// Define the K icon SVG
const K_ICON_ID = "kindle-k-icon";
const K_ICON = `
<svg width="100" height="100" viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
<path d="M25 15C25 12.2386 27.2386 10 30 10H35C37.7614 10 40 12.2386 40 15V45L65 20C66.5 18.5 68 18 70 18H75C77.7614 18 80 20.2386 80 23C80 24.3 79.5 25.5 78.5 26.5L52 50L82 83.5C83 84.5 83.5 85.7 83.5 87C83.5 89.7614 81.2614 92 78.5 92H72C70 92 68.5 91 67 89.5L40 58V87C40 89.7614 37.7614 92 35 92H30C27.2386 92 25 89.7614 25 87V15Z" />
</svg>
`;

interface KindleHighlightsSettings {
	path: string;
	// File creation settings
	createFile: boolean;
	includeFrontmatter: boolean;
	frontmatterTemplate: string;
	// Header settings
	importHeader: string;
	includeDate: boolean;
	// Tag settings
	addTags: boolean;
	tagsToAdd: string;
	// Note settings
	noteLabel: string;
	noteStyle: string; // "normal", "italic", "bold"
	// Callout settings
	yellowCallout: string;
	manualYellow: string;
	blueCallout: string;
	manualBlue: string;
	pinkCallout: string;
	manualPink: string;
	orangeCallout: string;
	manualOrange: string;
}

const DEFAULT_FRONTMATTER = `---
title: "{{title}}"
author: "{{author}}"
publisher: "{{publisher}}"
highlightsCount: "{{highlightsCount}}"
source: Kindle
tags:
{{tags}}
date: "{{date}}"
---
`;

const DEFAULT_SETTINGS: KindleHighlightsSettings = {
	path: "/",
	createFile: false,
	includeFrontmatter: true,
	frontmatterTemplate: DEFAULT_FRONTMATTER,
	importHeader: "Imported Highlights",
	includeDate: true,
	addTags: false,
	tagsToAdd: "kindle",
	noteLabel: "Note",
	noteStyle: "normal",
	yellowCallout: "quote",
	manualYellow: "",
	blueCallout: "info",
	manualBlue: "",
	pinkCallout: "important",
	manualPink: "",
	orangeCallout: "tip",
	manualOrange: "",
};

export default class KindleHighlightsPlugin extends Plugin {
	settings: KindleHighlightsSettings;

	async onload() {
		await this.loadSettings();

		addIcon(K_ICON_ID, K_ICON);

		this.addRibbonIcon(K_ICON_ID, "Import Kindle Highlights", () => {
			new FilePickerModal(this.app, (value) => {
				const reader = new FileReader();
				reader.onload = () => this.handleFileLoad(reader.result);
				reader.readAsText(value);
			}).open();
		});

		this.addCommand({
			id: "openKindleHighlightsModal",
			name: "Import Highlights from HTML file",
			callback: () => {
				new FilePickerModal(this.app, (value) => {
					const reader = new FileReader();
					reader.onload = () => this.handleFileLoad(reader.result);
					reader.readAsText(value);
				}).open();
			},
		});

		this.addSettingTab(new KindleHighlightsSettingsTab(this.app, this));
	}

	async handleFileLoad(fileContents: string | ArrayBuffer | null) {
		if (!fileContents) return;

		const $ = cheerio.load(fileContents as string);
		const bookTitle = $(".bookTitle").text().trim().replace(/[\\/*<>:|?"]/g, "");
		const author = $(".authors").text().trim().replace(/[\\/*<>:|?"]/g, "");
		const publisher = $(".publisher").text().trim().replace(/[\\/*<>:|?"]/g, "");

		let content = "";
		let highlightsCounter = 0;

		$(".noteHeading").each((index, element) => {
			const headingSpan = $(element).find("span[class^='highlight_']");
			if (headingSpan.length === 0) return; // Skip Notes and Bookmarks to avoid duplication

			let colorClass = "yellow"; // Default
			if (headingSpan.length > 0) {
				const cls = headingSpan.attr("class");
				if (cls) {
					const match = cls.match(/highlight_(\w+)/);
					if (match) colorClass = match[1];
				}
			}

			// Map color to callout
			let calloutType = "quote";
			const c = colorClass.toLowerCase();
			if (c === "yellow") calloutType = this.settings.yellowCallout === "custom" ? this.settings.manualYellow : this.settings.yellowCallout;
			else if (c === "blue") calloutType = this.settings.blueCallout === "custom" ? this.settings.manualBlue : this.settings.blueCallout;
			else if (c === "pink") calloutType = this.settings.pinkCallout === "custom" ? this.settings.manualPink : this.settings.pinkCallout;
			else if (c === "orange") calloutType = this.settings.orangeCallout === "custom" ? this.settings.manualOrange : this.settings.orangeCallout;

			if (!calloutType) calloutType = "quote";

			const pageMatch = $(element).text().match(/(Page|Location) (\d+)/);
			const pageLabel = pageMatch ? `${pageMatch[1]} ${pageMatch[2]}` : "";
			const noteText = $(element).next(".noteText").text().trim();

			// Extract User Note if present
			let userNote = "";
			if (
				$(element).next().next().children("span").length === 0 &&
				!$(element).next().next().hasClass("sectionHeading") &&
				$(element).next().next().length !== 0
			) {
				const possibleNote = $(element).next().next().next(".noteText").text().trim();
				if (possibleNote) {
					userNote = possibleNote;
				}
			}

			// Add formatted highlight as callout
			if (noteText) {
				content += `> [!${calloutType}]\n`;
				content += `> ${noteText}\n`;

				if (userNote) {
					// Apply styling to the note content
					let styledNote = userNote;
					if (this.settings.noteStyle === "italic") styledNote = `*${userNote}*`;
					else if (this.settings.noteStyle === "bold") styledNote = `**${userNote}**`;

					content += `> **${this.settings.noteLabel}**: ${styledNote}\n`;
				}

				if (pageLabel) {
					content += `> — *${pageLabel}*\n`;
				}
				content += `\n`; // Spacing
			}
			highlightsCounter++;
		});

		// --- Case-Insensitive Matching Logic ---
		let targetFile: TFile | null = null;
		const folderPath = this.settings.path;
		const folder = this.app.vault.getAbstractFileByPath(folderPath);

		if (folder instanceof TFolder) {
			for (const child of folder.children) {
				if (child instanceof TFile && child.extension === "md") {
					if (child.basename.toLowerCase() === bookTitle.toLowerCase()) {
						targetFile = child;
						break;
					}
				}
			}
		}

		if (!targetFile) {
			const exactPath = `${this.settings.path}/${bookTitle}.md`;
			const exactFile = this.app.vault.getAbstractFileByPath(exactPath);
			if (exactFile instanceof TFile) {
				targetFile = exactFile;
			}
		}

		if (targetFile instanceof TFile) {
			try {
				const currentContent = await this.app.vault.read(targetFile);

				let headerLine = `## ${this.settings.importHeader}`;
				if (this.settings.includeDate) {
					headerLine += ` (${new Date().toISOString().split('T')[0]})`;
				}

				const newContent = currentContent + `\n\n${headerLine}\n\n` + content;
				await this.app.vault.modify(targetFile, newContent);
				new Notice(`Highlights appended to ${bookTitle}`);

				if (this.settings.addTags && this.settings.tagsToAdd) {
					this.app.fileManager.processFrontMatter(targetFile, (frontmatter) => {
						const tags = this.settings.tagsToAdd.split(",").map(t => t.trim().replace(/^#/, '')).filter(t => t);
						if (tags.length > 0) {
							if (!frontmatter["tags"]) {
								frontmatter["tags"] = [];
							}
							let existingTags = frontmatter["tags"];
							if (typeof existingTags === 'string') {
								existingTags = [existingTags];
								frontmatter["tags"] = existingTags;
							}

							tags.forEach(tag => {
								if (!existingTags.includes(tag)) {
									existingTags.push(tag);
								}
							});
						}
					});
				}

			} catch (error) {
				new Notice(`Error modifying file: ${error}`);
			}
		} else {
			// Handle file creation if enabled
			if (this.settings.createFile) {
				try {
					let fileContent = "";
					const newFilePath = `${this.settings.path}/${bookTitle}.md`;

					// Construct Frontmatter from Template
					if (this.settings.includeFrontmatter) {
						let template = this.settings.frontmatterTemplate;

						// Determine tags block
						let tagsBlock = `  - Kindle\n  - ${author.replace(/\s+/g, "_")}\n  - ${bookTitle.replace(/\s+/g, "_")}\n`;
						if (this.settings.addTags && this.settings.tagsToAdd) {
							const extraTags = this.settings.tagsToAdd.split(",").map(t => t.trim().replace(/^#/, '')).filter(t => t);
							extraTags.forEach(t => tagsBlock += `  - ${t}\n`);
						}

						// Replace placeholders
						template = template
							.replace(/{{title}}/g, bookTitle)
							.replace(/{{author}}/g, author)
							.replace(/{{publisher}}/g, publisher)
							.replace(/{{highlightsCount}}/g, highlightsCounter.toString())
							.replace(/{{date}}/g, new Date().toISOString().split('T')[0])
							.replace(/{{tags}}/g, tagsBlock.trimEnd()); // trimEnd to match indentation slightly better if needed

						fileContent += template + "\n\n";
					}

					let headerLine = `## ${this.settings.importHeader}`;
					if (this.settings.includeDate) {
						headerLine += ` (${new Date().toISOString().split('T')[0]})`;
					}

					fileContent += `${headerLine}\n\n${content}`;

					await this.app.vault.create(newFilePath, fileContent);
					new Notice(`Created new note: ${bookTitle}`);

				} catch (error) {
					new Notice(`Error creating file: ${error}`);
				}
			} else {
				new Notice(`Book note not found: ${bookTitle} (checked path: ${this.settings.path})`);
			}
		}
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class FilePickerModal extends Modal {
	callback: (value: File) => void;

	constructor(app: App, callback: (value: File) => void) {
		super(app);
		this.callback = callback;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h1", { text: "Import Highlights" });
		contentEl.createEl("p", { text: "Select your Kindle HTML export file:" });

		const input = contentEl.createEl("input", {
			type: "file",
			attr: { single: "" },
		});

		contentEl.createEl("br");
		contentEl.createEl("br");

		const button = contentEl.createEl("button", {
			text: "Import",
			cls: "mod-cta"
		});

		button.addEventListener("click", () => {
			if (input.files && input.files.length > 0) {
				this.callback(input.files[0]);
				this.close();
			} else {
				new Notice("Please select a file first.");
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class KindleHighlightsSettingsTab extends PluginSettingTab {
	plugin: KindleHighlightsPlugin;

	constructor(app: App, plugin: KindleHighlightsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const folders: string[] = this.app.vault
			.getAllLoadedFiles()
			.filter((file) => file instanceof TFolder)
			.map((folderFile) => folderFile.path);

		new Setting(containerEl)
			.setName("Book Folder")
			.setDesc("Folder where the plugin should look for existing book notes.")
			.addDropdown((dropdown) => {
				dropdown.addOption("/", "Root (/)");
				folders.forEach((f) => dropdown.addOption(f, f));
				if (!folders.includes(this.plugin.settings.path) && this.plugin.settings.path !== "/") {
					dropdown.addOption(this.plugin.settings.path, this.plugin.settings.path);
				}
				dropdown.setValue(this.plugin.settings.path);
				dropdown.onChange(async (value) => {
					this.plugin.settings.path = value;
					await this.plugin.saveSettings();
				});
			});

		// --- File Creation ---
		containerEl.createEl("h3", { text: "File Creation" });

		new Setting(containerEl)
			.setName("Create New Notes")
			.setDesc("If enabled, a new note will be created if the book is not found in the selected folder.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.createFile)
					.onChange(async (value) => {
						this.plugin.settings.createFile = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.createFile) {
			new Setting(containerEl)
				.setName("Include Frontmatter")
				.setDesc("If enabled, metadata will be added to new notes.")
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.includeFrontmatter)
						.onChange(async (value) => {
							this.plugin.settings.includeFrontmatter = value;
							await this.plugin.saveSettings();
							this.display(); // Refresh to show template
						})
				);

			if (this.plugin.settings.includeFrontmatter) {
				new Setting(containerEl)
					.setName("Frontmatter Template")
					.setDesc("Customize the YAML frontmatter. supported placeholders: {{title}}, {{author}}, {{publisher}}, {{highlightsCount}}, {{date}}, {{tags}}.")
					.addTextArea((text) =>
						text
							.setValue(this.plugin.settings.frontmatterTemplate)
							.setPlaceholder(DEFAULT_FRONTMATTER)
							.onChange(async (value) => {
								this.plugin.settings.frontmatterTemplate = value;
								await this.plugin.saveSettings();
							})
					).then(setting => {
						setting.controlEl.style.width = "100%";
						setting.controlEl.querySelector("textarea")!.style.height = "200px";
					});
			}
		}

		// --- Tagging ---
		containerEl.createEl("h3", { text: "Tag Injection" });

		new Setting(containerEl)
			.setName("Add Tags to Existing Notes")
			.setDesc("If enabled, the specified tags will be added to the frontmatter of existing notes upon update.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.addTags)
					.onChange(async (value) => {
						this.plugin.settings.addTags = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.addTags || (this.plugin.settings.createFile && this.plugin.settings.includeFrontmatter)) {
			const setting = new Setting(containerEl)
				.setName("Tags to Add")
				.setDesc("Comma-separated list of tags to add (e.g. 'kindle, reading').");

			setting.addText((text) =>
				text
					.setValue(this.plugin.settings.tagsToAdd)
					.onChange(async (value) => {
						this.plugin.settings.tagsToAdd = value;
						await this.plugin.saveSettings();
					})
			);
		}

		// --- Import Configuration ---
		containerEl.createEl("h3", { text: "Import Configuration" });

		new Setting(containerEl)
			.setName("Header Title")
			.setDesc("The title of the section created for the user's import.")
			.addText((text) =>
				text
					.setPlaceholder("Imported Highlights")
					.setValue(this.plugin.settings.importHeader)
					.onChange(async (value) => {
						this.plugin.settings.importHeader = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Include Date in Header")
			.setDesc("If enabled, the date will be appended to the header title.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeDate)
					.onChange(async (value) => {
						this.plugin.settings.includeDate = value;
						await this.plugin.saveSettings();
					})
			);

		// --- Note Configuration ---
		containerEl.createEl("h3", { text: "Note Customization" });

		new Setting(containerEl)
			.setName("Note Label")
			.setDesc("The label used for user notes (e.g. 'Note', 'Nota', 'Comment').")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.noteLabel)
					.onChange(async (value) => {
						this.plugin.settings.noteLabel = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Note Text Style")
			.setDesc("The visual style of the note content.")
			.addDropdown((dropdown) => {
				dropdown.addOption("normal", "Normal");
				dropdown.addOption("italic", "Italic (*text*)");
				dropdown.addOption("bold", "Bold (**text**)");
				dropdown.setValue(this.plugin.settings.noteStyle);
				dropdown.onChange(async (value) => {
					this.plugin.settings.noteStyle = value;
					await this.plugin.saveSettings();
				});
			});

		// --- Colors ---
		containerEl.createEl("h3", { text: "Callout Mappings" });

		const calloutOptions = {
			"quote": "Quote (Standard)",
			"info": "Info (Blue)",
			"todo": "Todo (Blue)",
			"warning": "Warning (Orange)",
			"tip": "Tip (Orange)",
			"success": "Success (Green)",
			"question": "Question (Yellow)",
			"important": "Important (Cyan/Pink)",
			"fail": "Fail (Red)",
			"danger": "Danger (Red)",
			"bug": "Bug (Red)",
			"example": "Example (Purple)",
			"caption": "Caption (Grey)",
			"custom": "CUSTOM..."
		};

		const createColorSetting = (name: string, desc: string, settingKey: keyof KindleHighlightsSettings, manualKey: keyof KindleHighlightsSettings) => {
			const settingDiv = new Setting(containerEl)
				.setName(name)
				.setDesc(desc);

			settingDiv.addDropdown((dropdown) => {
				// @ts-ignore
				Object.entries(calloutOptions).forEach(([val, label]) => dropdown.addOption(val, label));
				dropdown.setValue(this.plugin.settings[settingKey] as string);
				dropdown.onChange(async (value) => {
					// @ts-ignore
					this.plugin.settings[settingKey] = value;
					await this.plugin.saveSettings();
					this.display();
				});
			});

			if (this.plugin.settings[settingKey] === "custom") {
				settingDiv.addText((text) => {
					text.setPlaceholder("my-custom-callout")
						.setValue(this.plugin.settings[manualKey] as string)
						.onChange(async (value) => {
							// @ts-ignore
							this.plugin.settings[manualKey] = value;
							await this.plugin.saveSettings();
						});
				});
			}
		};

		createColorSetting("Default / Yellow Highlights", "Standard highlight color (used by B&W Kindles)", "yellowCallout", "manualYellow");
		createColorSetting("Blue Highlights", "Select callout for blue highlights", "blueCallout", "manualBlue");
		createColorSetting("Pink Highlights", "Select callout for pink highlights", "pinkCallout", "manualPink");
		createColorSetting("Orange Highlights", "Select callout for orange highlights", "orangeCallout", "manualOrange");
	}
}
