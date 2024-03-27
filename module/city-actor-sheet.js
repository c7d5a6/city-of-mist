
import { CityDialogs } from "./city-dialogs.mjs";
import {CityHelpers} from "./city-helpers.js";
import {CityActor} from "./city-actor.js";
import { CitySheet } from "./city-sheet.js";
import { CityRoll } from "./city-roll.js";
import { CityLogger } from "./city-logger.mjs";
import { SelectedTagsAndStatus } from "./selected-tags.mjs";
import {HTMLHandlers} from "./universal-html-handlers.mjs";
import {CitySettings} from "./settings.js";

export class CityActorSheet extends CitySheet {
	constructor(...args) {
		super(...args);
	}

	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["city", "sheet", "actor"],
			template: "systems/city-of-mist/templates/actor-sheet.html",
			width: 990,
			height: 1070,
			tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "themes"}]
		});
	}

	/* -------------------------------------------- */

	//override
	_onEditImage (event) {
		super._onEditImage(event); //plan for future dual image support
	}

	/* -------------------------------------------- */

	/** @override */
	activateListeners(html) {
		super.activateListeners(html);
		if (!this.options.editable) return;
		//Everything below here is only needed if the sheet is editable
		HTMLHandlers.applyBasicHandlers(html);
		html.find('.theme-item-edit').change( this._modifyThemeField.bind(this));
		html.find('.theme-item-edit').focusout( this._modifyThemeField.bind(this));
		html.find('.theme-name-input').change( this._themebookNameInput.bind(this));
		html.find('.theme-name-input').focusout( this._themebookNameInput.bind(this));
		html.find('.theme-create-power-tag').click(this._createTagOrImprovement.bind(this) );
		html.find('.theme-create-weakness-tag').click(this._createTagOrImprovement.bind(this) );
		html.find('.theme-create-bonus-tag').click(this._createBonusTag.bind(this) );
		html.find('.theme-create-improvement').click(this._createTagOrImprovement.bind(this) );
		html.find('.imp-delete').click(this._deleteImprovement.bind(this) );
		html.find('.theme-delete').click(this._deleteTheme.bind(this) );
		html.find('.theme-add-attention').click(this._addAttentionOrFade.bind(this));
		html.find('.theme-remove-attention').click( this._removeAttentionOrFade.bind(this) );
		html.find('.theme-add-fade').click(this._addAttentionOrFade.bind(this));
		html.find('.theme-remove-fade').click( this._removeAttentionOrFade.bind(this) );
		html.find('.improvement-name').click(this._sendImprovementToChat.bind(this));
		html.find('.improvement-edit').click(this._improvementEdit.bind(this));
		html.find('.theme-reset-fade').click( this._resetFade.bind(this) );

		html.find('.identity-input').change(this._themeChangeInput.bind(this));
		html.find('.active-extra-drop-down').change(this._activeExtraChange.bind(this));
		html.find('.status-text-list-header').middleclick(this._createStatus.bind(this));

		html.find('.create-clue').click(this._createClue.bind(this));
		html.find('.clue-delete').click(this._deleteClue.bind(this));
		html.find('.clue-journal-delete').click(this._deleteJournalClue.bind(this));
		html.find('.create-juice').click(this._createJuice.bind(this));
		html.find('.juice-delete').click(this._deleteJuice.bind(this));
		html.find('.create-help').click(this._createHelp.bind(this));
		html.find('.create-hurt').click(this._createHurt.bind(this));
		html.find('.clue-name').click( this._clueEdit.bind(this) );
		html.find('.clue-name').middleclick( this._clueEdit.bind(this));
		html.find('.juice-name').click( this._juiceEdit.bind(this) );
		html.find('.juice-name').middleclick(this._juiceEdit.bind(this) );
		html.find('.increment-buildup').click( this._buildUpIncrement.bind(this) );
		html.find('.decrement-buildup').click( this._buildUpDecrement.bind(this) );
		html.find('.add-buildup-improvement').click( this._addBUImprovement.bind(this) );
		html.find('.execute-move-button').click( this._executeMove.bind(this) );
		html.find('.story-tags-header').middleclick(this._createStoryTag.bind(this));
		html.find('.clue-use-button').click(this._useClue.bind(this));
		// this.testHandlers(html);
	}

	async getData() {
		let data = await super.getData();
		data.storyTags = this.getStoryTags();
		const object =  {
			secrets: this.actor.isOwner,
			async: true,
			relativeTo: this.actor
		};
		data.gmnotes = await TextEditor.enrichHTML(this.actor.system.gmnotes, object);
		data.description = await TextEditor.enrichHTML(this.actor.system.description, object)
		data.biography = await TextEditor.enrichHTML(this.actor.system.biography, object)
		return data;
	}

	getPersonalStoryTags() {
		return this.actor.getStoryTags();
	}

	getStoryTags() {
		return this.getPersonalStoryTags();
	}

	linkThemebook(theme) {
		throw new Error("Deprecated");
		// const themedata = theme.system;
		// themedata.themebook = CityHelpers.getThemebook(themedata.themebook_name, themedata.themebook_id);
	}

	/* -------------------------------------------- */

	/** override */
	get template() {
		if ( !game.user.isGM && this.actor.limited ) return "systems/city-of-mist/templates/limited-actor.html";
		return this.options.template;
	}

	/** returns the owner of the given id, tokenId and sceneId
	@return {CityActor}
	*/
	getOwner(id, tokenId, sceneId) {
		if (!id || id == this.actor.id)
			return this.actor;
		else return CityHelpers.getOwner(id, tokenId, sceneId);
	}

	async _themeChangeInput(event) {
		const id = getClosestData(event, "themeId");
		const field = getClosestData(event, "property");
		const val =  $(event.currentTarget).val();
		const actorId = getClosestData(event, "ownerId");
		const actor = this.getOwner(actorId);
		const theme = await actor.getTheme(id);
		await theme.setField(field, val);
	}

	async _themebookNameInput (event) {
		const id = getClosestData(event, "themeId");
		const name =  $(event.currentTarget).val();
		const actorId = getClosestData(event, "ownerId");
		const actor = this.getOwner(actorId);
		const theme = await actor.getTheme(id);
		await theme.update ({name});
	}

	async _modifyThemeField(event) {
		const theme_id = getClosestData(event, "themeId");
		const field = getClosestData(event, "dataField");
		const actorId = getClosestData(event, "ownerId");
		const actor = this.getOwner(actorId);
		const theme = await actor.getTheme(theme_id);
		var obj = {};
		obj.field = $(event.currentTarget).val();
		await theme.update({obj});
	}

	async _createTagOrImprovement (event, bonus = false) {
		//TODO: allow for text string attachment to improvements
		const ownerId = getClosestData(event, "ownerId");
		const owner = await this.getOwner(ownerId);
		const themeId = getClosestData(event, "themeId");
		const itemtype = getClosestData(event, "itemType");
		const theme = owner.getTheme(themeId);
		const subtype = getClosestData(event, "subType", null);
		let idChoice;
		if (!bonus) {
			idChoice  = await CityDialogs.improvementOrTagChoiceList(owner, theme, itemtype, subtype );
			if (idChoice == null)
				return;
		}
		let retobj = null;
		let tag, improvement;
		if (itemtype == "tag")  {
			const subtype = bonus ? "bonus" : getClosestData(event, "subType");
			const awardImprovement =
				subtype == "weakness"
				&& theme.weaknessTags.length >= 1
				? (
					CitySettings.autoAwardImpForWeakness()
					|| await CityDialogs.confirmBox(
						localize("CityOfMist.dialog.addTag.confirmExtraImprovementOnWeakness.title"),
						localize("CityOfMist.dialog.addTag.confirmExtraImprovementOnWeakness.body"),
						{onClose : "reject"}
					)
				): false ;
			const options = {
				awardImprovement
			};
			retobj = await owner.addTag(themeId, subtype, idChoice, options);
			// tag = await owner.getTag(retobj.id);
			// if (!tag.isPartOfThemeKit())
			// 	await this.tagDialog(tag);
			// await CityHelpers.modificationLog(owner, "Created",  tag);
		} else {
			retobj = await owner.addImprovement(themeId, idChoice);
			improvement = await owner.getImprovement(retobj.id);

			await this.improvementDialog(improvement);
			await CityHelpers.modificationLog(owner,  "Created", improvement);
			return;
		}
	}

	async _createBonusTag(event) {
		await this._createTagOrImprovement(event, true);
	}

	async _deleteTag (event) {
		await HTMLHandlers.deleteTag(event);
	}

	async _deleteImprovement (event) {
		const actorId = getClosestData(event, "ownerId");
		const actor = await this.getOwner(actorId);
		const tagId = getClosestData(event, "impId");
		const tag = await actor.getImprovement(tagId);
		const tagName = tag.name;
		if (await this.confirmBox("Confirm Delete", `Delete ${tagName}`)) {
			await actor.deleteImprovement(tagId);
			await CityHelpers.modificationLog(actor, `Deleted`, tag);
		}
	}

	async _tagSelect(event, invert = false) {
		return HTMLHandlers._tagSelect(event, invert);
	}

	async tagDialog(obj) {
		return await CityHelpers.itemDialog(obj);
	}

	async improvementDialog(obj) {
		return await CityHelpers.itemDialog(obj);
	}

	async _improvementEdit(event) {
		const id = getClosestData(event, "impId");
		const actorId = getClosestData(event, "ownerId");
		const owner = await this.getOwner(actorId);
		const imp = await owner.getImprovement(id);
		if (!imp.system.chosen)
			await imp.reloadImprovementFromCompendium();
		await this.improvementDialog(imp);
	}

	async _deleteTheme(event) {
		const themeId = getClosestData( event, "themeId");
		const actorId = getClosestData(event, "ownerId");
		const actor = await this.getOwner(actorId);
		const theme = await actor.getTheme(themeId);
		const themeName = theme.name;
		if (actor.isNewCharacter()) {
			if (await this.confirmBox("Confirm Delete", `Delete Theme ${themeName}`)) {
				await	actor.deleteTheme(themeId, false);
				await CityHelpers.modificationLog(actor, "Deleted", theme);
			}
		} else {
			let ret;
			if (ret = await this.themeDeleteChoicePrompt(themeName)) {
				switch (ret) {
					case "replace":
						await	actor.deleteTheme(themeId, true);
						break;
					case "delete":

						if (await this.confirmBox(localize("CityOfMist.dialog.actorSheet.deleteTheme.title"), localize("CityOfMist.dialog.actorSheet.deleteTheme.title"))) {
							await	actor.deleteTheme(themeId, false);
						}
							break;
							default:
							return true;
						}
				}
			}
		}

	async _burnTag (event) {
		await HTMLHandlers.burnTag(event);
	}

	async _unburnTag (event) {
		await HTMLHandlers.unburnTag(event);
	}

	async _addAttentionOrFade (event) {
		const id = getClosestData( event, "themeId");
		const type = getClosestData( event, "type");
		const actorId = getClosestData(event, "ownerId");
		const actor = await this.getOwner(actorId);
		const theme = await actor.getTheme(id);
		const themeName = theme.name;
		switch (type) {
			case "attention":
				await actor.addAttention(id);
				break;
			case "crack":
				await actor.addFade(id);
				break;
			default:
				throw new Error(`Unrecognized Type ${type}`);
		}
	}

	async _removeAttentionOrFade (event) {
		const id = getClosestData( event, "themeId");
		const type = getClosestData( event, "type");
		const actorId = getClosestData(event, "ownerId");
		const actor = await this.getOwner(actorId);
		const theme = await actor.getTheme(id);
		const themeName = theme.name;
		switch (type) {
			case "attention":
				await actor.removeAttention(id);
				break;
			case "crack":
				await actor.removeFade(id);
				break;
			default:
				throw new Error(`Unrecognized Type ${type}`);
		}
	}

	async _resetFade (event) {
		const id = getClosestData( event, "themeId");
		const actorId = getClosestData(event, "ownerId");
		const actor = await this.getOwner(actorId);
		const theme = await actor.getTheme(id);
		const themename = theme.name;
		if (await this.confirmBox("Reset Fade", `spend an improvement to reset Fade/Crack on theme: ${themename}`)) {
			actor.resetFade(id);
			await CityHelpers.modificationLog(actor, `Spent Theme Upgrade to Reset Fade`, theme);
		}
	}

	async _sendImprovementToChat(event) {
		const impId = getClosestData( event, "impId");
		const actorId = getClosestData(event, "ownerId");
		const actor = await this.getOwner(actorId);
		const imp = await actor.getImprovement(impId);
		const impName = imp.name
		const impDescript = imp.system.description;
		const templateData = {improvement: imp, data: imp.system};
		const html = await renderTemplate("systems/city-of-mist/templates/improvement-chat-description.html", templateData);
		const uses = imp.getImprovementUses();
		const uses_str = (uses < 9999) ? `(uses left ${uses})` : "";
		const disable = (uses <= 0);
		const options = {
			label: `${localize("CityOfMist.command.use")} ${uses_str}`,
			disable,
			speaker: {actor: this.actor, alias: this.actor.getDisplayedName() }
		};
		if (await this.sendToChatBox(localizeS(impName), html, options)) {
			if (uses < 9999)
				await imp.decrementImprovementUses();
		}
	}

	async _activeExtraInit(elem) {}

	async _activeExtraChange(event) {
		if (this.actor.type != "character")
			return;
		const elem = $(this.form).find('.active-extra-drop-down');
		const val = elem.val();
		if (val == undefined)
			throw new Error("value is undefined!");
		if (this.actor.system.activeExtraId != val) {
			await this.actor.setExtraThemeId(val);
			const extra = game.actors.find(x => x.id == val);
			const name  = extra ? extra.name : "None";
			if (extra)
				await CityHelpers.modificationLog(this.actor, `Activated Extra ${extra.name}`);
			else
				await CityHelpers.modificationLog(this.actor, `deactivated extra Theme`);
		}
	}

	async _createStatus (event) {
		const owner = this.actor;
		const obj = await this.actor.createNewStatus("Unnamed Status")
		const status = await owner.getStatus(obj.id);
		const updateObj = await this.statusDialog(status);
		if (updateObj) {
			CityHelpers.modificationLog(owner, "Created", updateObj, `tier  ${updateObj.system.tier}`);
		} else {
			await owner.deleteStatus(obj.id);
		}
	}

	async _deleteStatus (event, autodelete = false) {
		await HTMLHandlers.deleteStatus(event, autodelete);
	}


	async _createClue (_event) {
		const owner = this.actor;
		const obj = await this.actor.createNewClue("Unnamed Clue");
		const clue = await owner.getClue(obj.id);
		const updateObj = await this.CJDialog("clue", clue);
		if (updateObj) {
			const partialstr = clue.system.partial ? ", partial": "";
			CityHelpers.modificationLog(owner, "Created", clue, `${clue.system.amount}${partialstr}` );
		} else  {
			await owner.deleteClue(obj.id);
		}
	}

	async _deleteClue (event) {
		event.stopPropagation();
		const clue_id = getClosestData(event, "clueId");
		const actorId = getClosestData(event, "ownerId");
		const owner = await this.getOwner(actorId);
		const clue = await owner.getClue(clue_id);
		// if (await this.confirmBox("Delete Clue", `Delete ${clue.name}`)) {
		await owner.deleteClue(clue_id);
		CityHelpers.modificationLog(owner, "Removed", clue );
		// }
	}

	async _deleteJournalClue (event) {
		const clue_id = getClosestData(event, "clueId");
		const actorId = getClosestData(event, "ownerId");
		const owner = await this.getOwner(actorId);
		const clue = await owner.getJournalClue(clue_id);
		await owner.deleteClue(clue_id);
		// CityHelpers.modificationLog(owner, "Removed", clue );

	}

	async _createJuice (event) {
		return await this._createJuiceOfType("Unnamed Juice");
	}

	async _createHelp (event) {
		return await this._createJuiceOfType("Help", "help");
	}

	async _createHurt (event) {
		return await this._createJuiceOfType("hurt", "hurt");
	}

	async _createJuiceOfType (basename, subtype = "") {
		const owner = this.actor;
		const obj = await owner.createNewJuice(basename, subtype);
		const juice = await owner.getJuice(obj.id);
		const updateObj = await this.CJDialog("juice", juice);
		if (updateObj) {
			CityHelpers.modificationLog(owner, "Created", juice, `${juice.system.amount}` );
		} else  {
			await owner.deleteJuice(obj.id);
		}
	}

	async _deleteJuice (event) {
		const juice_id = getClosestData(event, "juiceId");
		const actorId = getClosestData(event, "ownerId");
		const owner = await this.getOwner(actorId);
		const juice = await owner.getJuice(juice_id);
		// if (await this.confirmBox("Delete Juice", `Delete ${juice.name}`)) {
		await owner.deleteJuice(juice_id);
		CityHelpers.modificationLog(owner, "Removed", juice);
		// }
	}

	async _statusAdd (event) {
		//adds a second status to existing
		await HTMLHandlers.statusAdd(event);
	}

	async statusDrop({name, tier}) {
		if (!tier)
			throw new Error(`Tier is not valid ${tier}`);
		const retval = await CityDialogs.statusDropDialog(this.actor, name, tier);
		if (retval == null) return null;
		switch (retval.action) {
			case 'create':
				const status = await this.actor.addOrCreateStatus(retval.name, retval.tier, retval.pips);
				await CityHelpers.modificationLog(this.actor, "Created", status, `tier  ${retval.tier}`);
				return status;
			case 'merge':
				const origStatus =  await this.actor.getStatus(retval.statusId);
				const {data: {name, data: {tier, pips}}} = origStatus;
				await origStatus.addStatus(retval.tier, retval.name);
				await this.reportStatusAdd(this.actor, retval.tier,  {name, tier, pips}, origStatus);
				return origStatus;
			default:
				throw new Error(`Unknown action : ${retval.action}`);
		}
	}

	async _statusSubtract (event) {
		return HTMLHandlers.statusSubtract(event);
	}

	async reportStatusAdd(owner,  amt, {name: oldname, tier: oldtier, pips:oldpips}, status) {
		await HTMLHandlers.reportStatusAdd.apply(HTMLHandlers, arguments);
	}

	async reportStatsuSubtract(owner,  amt, {name: oldname, tier: oldtier, pips:oldpips}, status) {
		await HTMLHandlers.reportStatusSubtract.apply(HTMLHandlers, arguments);
	}

	async _statusEdit (event) {
		const status_id = getClosestData(event, "statusId");
		const ownerId = getClosestData(event, "ownerId");
		const owner = await this.getOwner(ownerId);
		const status = await owner.getStatus(status_id);
		const oldtier = status.system.tier;
		const oldpips = status.system.pips;
		const oldname = status.name;
		const updateObj = await this.statusDialog(status);
		if (updateObj)  {
			const oldpipsstr =+ oldpips ? `.${oldpips}`: "";
			const pipsstr =+ status.system.pips ? `.${status.system.pips}`: "";
			CityHelpers.modificationLog(owner, "Edited", status ,`${oldname}-${oldtier}${oldpipsstr} edited --> ${status.name}-${status.system.tier}${pipsstr})` );
		}
	}

	async _juiceEdit (event) {
		const juice_id = getClosestData(event, "juiceId");
		const ownerId = getClosestData(event, "ownerId");
		const owner = this.getOwner(ownerId);
		const juice = await owner.getJuice(juice_id);
		const oldname = juice.name;
		const oldamount = juice.system.amount;
		const updateObj = await this.CJDialog("juice", juice);
		if (updateObj) {
			CityHelpers.modificationLog(owner, "Edited", juice, `${oldname} (${oldamount}) edited --> ${updateObj.name} (${updateObj.system.amount})` );
		}
	}

	async _createStoryTag(_event) {
		const owner = this.actor;
		const retobj = await owner.createStoryTag();
		const tag = await owner.getTag(retobj.id);
		await this.tagDialog(tag);
		await CityHelpers.modificationLog(owner, "Created", tag);
	}

	async _useClue(event) {
		if (game.user.isGM) {
			ui.notifications.warn("only players can use clues");
			return;
		}
		const clue_id = getClosestData(event, "clueId");
		const actorId = getClosestData(event, "ownerId");
		const owner =  this.getOwner(actorId);
		const clue = await owner.getClue(clue_id);
		if (await this.confirmBox("Use Clue", "Use Clue?"))
			await clue.spendClue();
	}

	async _buildUpDecrement(event) {
		const actorId = getClosestData(event, "ownerId");
		const actor = await this.getOwner(actorId);
		if (await this.confirmBox("Remove Build Up Point", `Remove Build Up Point to ${actor.name}`)) {
			await actor.decBuildUp();
			await CityHelpers.modificationLog(actor, `Build Up Point Removed (Current ${await actor.getBuildUp()})`);
		}
	}

	async _addBUImprovement (_event) {
		const list = await CityHelpers.getBuildUpImprovements();
		const choiceList = list
			.map ( x => {
				return {
					id: x.id,
					data: [x.name],
					description: x.data.description
					//TODO: wierd format probably need to change some stuff since its not x.system
				}
			});
		const choice = await CitySheet.singleChoiceBox(choiceList, "Choose Build-up Improvement");
		if (!choice)
			return;
		const imp = await this.actor.addBuildUpImprovement(choice);
		await CityHelpers.modificationLog(this.actor, "Added", imp);
	}

	async _buildUpIncrement (event) {
		const actorId = getClosestData(event, "ownerId");
		const actor = await this.getOwner(actorId);
		if (await this.confirmBox("Add Build Up Point", `Add Build Up Point to ${actor.name}`)) {
			await actor.incBuildUp();
			CityHelpers.modificationLog(actor, `Build Up Point Added`, null, `Current ${await actor.getBuildUp()}`);
		}
		let unspentBU = actor.system.unspentBU;
		while (unspentBU > 0) {
			const impId = await this.chooseBuildUpImprovement(actor);
			if (impId == null)
				break;
			await actor.addBuildUpImprovement(impId);
			unspentBU = actor.system.unspentBU;
			refresh = true;
		}
	}

	async chooseBuildUpImprovement (owner) {
		const improvementsChoices = await CityHelpers.getBuildUpImprovements();
		const actorImprovements = await owner.getBuildUpImprovements();
		const filteredChoices = improvementsChoices.filter (x=> !actorImprovements.find(y => x.name == y.name));
		const inputList = filteredChoices.map( x => {
			const data = [x.name];
			return {
				id : x.id,
				data,
				description: x.data.description
				//TODO: wierd format probably need to change some stuff since its not x.system
			};
		});
		const choice = await CitySheet.singleChoiceBox(inputList, "Choose Build-up Improvement");
		return choice;
	}

	async _clueEdit (event) {
		const clue_id = getClosestData(event, "clueId");
		const ownerId = getClosestData(event, "ownerId");
		const owner = await this.getOwner(ownerId);
		const clue = await owner.getClue(clue_id);
		const oldname = clue.name;
		const oldamount = clue.system.amount;
		const updateObj = await this.CJDialog("clue", clue);
		if (updateObj) {
			CityHelpers.modificationLog(owner, "Edited", clue, `${oldname} (${oldamount}) edited --> ${updateObj.name} (${updateObj.system.amount})` );
		}
	}

	async chooseImprovement(themeId) {
		const themename = await this.actor.getTheme(themeId);
		const prompt = `Choose Improvement for ${themename}`;
		const choiceList = ["Reset Fade", "Add New Tag", "Add Improvement"];
		const inputList = choiceList.map( x => {
			const data = [x]
			return {
				id: x, data
			};
		});
		const choice = await CitySheet.singleChoiceBox(inputList, "Choose Item");
		switch (choice) {
			case "Reset Fate":
				throw new Error("Not Yet implemented");
				break;
			case "Add New Tag":
				throw new Error("Not Yet implemented");
				break;
			case "Add Improvement":
				throw new Error("Not Yet implemented");
				break;
			default:
				throw new Error(`Unrecognized choice ${choice}`);
		}
	}

	async _executeMove (event) {
		const move_id = $(this.form).find(".select-move").val();
		if (!move_id)
			throw new Error(`Bad Move Id: Move Id is ${move_id}, can't execute move`);
		const move_group = $(this.form).find(".select-move-group").val();
		const SHB = move_group == "SHB";
		let newtype = null;
		if (SHB) {
			const SHBType = await this.SHBDialog(this.actor);
			if (!SHBType)
				return;
			newtype = SHBType;
		}
		const options = {
			newtype
		};
		const selectedTagsAndStatuses = SelectedTagsAndStatus.getPlayerActivatedTagsAndStatus();
		const roll = await CityRoll.execMove(move_id, this.actor, selectedTagsAndStatuses, options);
		if (roll == null)
			return;
		SelectedTagsAndStatus.clearAllActivatedItems();
		this.render(true);
		const move = CityHelpers.getMoves().find(x=> x.id == move_id);
		for (const effect of move.effect_classes) {
			switch (effect) {
				case "DOWNTIME":
					if (this.downtime)
						await this.downtime();
					break;

				case "MONOLOGUE":
					if (this.monologue)
						await this.monologue();
					break;
				case "SESSION_END":
					if (this.sessionEnd)
						await this.sessionEnd();
					break;
				case "FLASHBACK":
					if (this.flashback)
						await this.flashback();
					break;
			}
		}
	}

	async statusDialog(obj) {
		return await CityHelpers.itemDialog(obj);
	}

	async CJDialog(objtype, obj) {
		return await CityHelpers.itemDialog(obj);
	}

	async SHBDialog (actor) {
		const title = "You sure about this?";
		const html = await renderTemplate("systems/city-of-mist/templates/dialogs/SHB-dialog.html", {actor});
		return new Promise ( (conf, rej) => {
			const options = {};
			const dialog = new Dialog({
				title:`${title}`,
				content: html,
				buttons: {
					one: {
						label: localize("CityOfMist.dialog.SHB.yes"),
						callback: (html) => {
							const result = $(html).find(".SHB-selector:checked").val();
							conf(result);
						}
					},
					cancel: {
						label: localize("CityOfMist.dialog.SHB.no"),
						callback: () => conf(null)
					},
				},
				default: "cancel"
			}, options);
			dialog.render(true);
		});
	}

}
