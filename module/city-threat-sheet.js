import { CitySheet } from "./city-sheet.js";
import { CityActorSheet } from "./city-actor-sheet.js";
import {CityDB} from "./city-db.mjs";

export class CityThreatSheet extends CityActorSheet {

	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["city", "sheet", "actor"],
			template: "systems/city-of-mist/templates/threat-sheet.html",
			width: 990,
			height: 1070,
			tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "moves"}]
		});
	}

	activateListeners(html) {
		super.activateListeners(html);

		//Everything below here is only needed if the sheet is editable
		if (!this.options.editable) return;
		html.find('.alias-input').focusout(this._aliasInput.bind(this));
		html.find('.alias-input').change(this._aliasInput.bind(this));
		html.find('.create-gm-move').click(this._createGMMove.bind(this));
		html.find('.gm-moves-header').middleclick(this._createGMMove.bind(this));
		html.find('.gmmove-delete').click(this._deleteGMMove.bind(this));
		html.find('.gmmove-edit').click(this._editGMMove.bind(this));
		html.find('.gmmove-select').click(this._selectGMMove.bind(this));
		html.find('.gmmove-select').rightclick(this._editGMMove.bind(this));
		html.find('.gmmove-select').middleclick( this._editGMMove.bind(this));
		html.find('.create-spectrum').click(this._createSpectrum.bind(this));
		html.find('.spectrum-editable').click(this._editSpectrum.bind(this));
		html.find('.spectrum-delete').click(this._deleteSpectrum.bind(this));
		html.find('.alias-input-unlinked-token').change(this._changeunlikedtokenName.bind(this));
		html.find('.alias-input-prototype').change(this._changelinkedtokenName.bind(this));
		html.find('.template-add').click(this._addTemplate.bind(this));
		html.find('.template-delete').click(this._deleteTemplate.bind(this));
		html.find('.template-name').click(this._jumpToTemplate.bind(this));
	}

	async getData() {
		const data = await super.getData();
		for (let gmmove of this.actor.gmmoves) {
			if (gmmove.decryptData)
				await gmmove.decryptData();
		}
		return data;

	}

	async _changelinkedtokenName (event) {
		const val =  $(event.currentTarget).val();
		if (val)
			for (let tok of this.actor.getLinkedTokens()) {
				// console.log(`Re-aliasing: ${val}`);
				// await tok.update({name: val});
				await tok.document.update({name: val});
			}
		return true;
	}

	async _changeunlikedtokenName (event) {
		const val =  $(event.currentTarget).val();
		if (val)
			await this.actor.token.update({name: val});
		return true;
	}

	async _createSpectrum (_event) {
		const owner = this.actor;
		const obj = await this.actor.createNewSpectrum("Unnamed Spectrum")
		const spec = await owner.getSpectrum(obj.id);
		const updateObj = await CityHelpers.itemDialog(spec);
		if (updateObj) {
		} else {
			await owner.deleteSpectrum(obj._id);
		}
	}

	async _editSpectrum(event) {
		const owner = this.actor;
		const id = getClosestData(event, "spectrumId");
		const spec = await owner.getSpectrum(id);
		await CityHelpers.itemDialog(spec);
	}

	async _deleteSpectrum(event) {
		event.preventDefault();
		event.stopPropagation();
		const owner = this.actor;
		const id = getClosestData(event, "spectrumId");
		const spec = await owner.getSpectrum(id);
		if (await this.confirmBox("Delete Status", `Delete ${spec.name}`)) {
			await owner.deleteSpectrum(id);
		}
	}

	async _aliasInput (event) {
		const val =  $(event.currentTarget).val();
		await this.actor.setTokenName(val);
	}

	async _createGMMove(_event) {
		const owner = this.actor;
		const obj = await this.actor.createNewGMMove("Unnamed Move")
		const move = await owner.getGMMove(obj.id);
		await this.moveDialog(move);
		// await move.updateGMMoveHTML();
	}

	async _deleteGMMove(event) {
		event.stopImmediatePropagation();
		const move_id = getClosestData(event, "moveId");
		if (!this.actor.ownsMove(move_id)) return;
		const actorId = getClosestData(event, "ownerId");
		const owner = await this.getOwner(actorId);
		const move = await owner.getGMMove(move_id);
		if (await this.confirmBox("Delete Move", `Delete ${move.name}`)) {
			await owner.deleteClue(move_id);
		}
	}

	async _editGMMove(event) {
		const move_id = getClosestData(event, "moveId");
		if (!this.actor.ownsMove(move_id)) return;
		const ownerId = getClosestData(event, "ownerId");
		const owner = await this.getOwner(ownerId);
		const move = await owner.getGMMove(move_id);
		await this.moveDialog(move);
		// await move.updateGMMoveHTML();
	}

	async _selectGMMove(event) {
		const move_id = getClosestData(event, "moveId");
		const ownerId = getClosestData(event, "ownerId");
		const owner = await this.getOwner(ownerId);
		const move = await owner.getGMMove(move_id);
		await move.GMMovePopUp(this.actor);
	}

	async moveDialog(item) {
		return await CityHelpers.itemDialog(item);
	}

	async _gmmoveRightMouseDown (event) {
		if (event.which == 3) {
			this._editGMMove(event, true);
			event.preventDefault();
		}
	}

	async _addTemplate (_event) {
		const inputList = CityHelpers.dangerTemplates
			.filter( x=> x != this.actor && !this.actor.hasTemplate(x.id))
			.map( x => {
				const name = x.name;
				const data = [name];
				return {
					id: x.id ?? x._id, data, description: x.description
				};
			});
		const choice =  await CitySheet.singleChoiceBox(inputList, "Choose Item");
		if (!choice) return;
		await this.actor.addTemplate(choice);
	}

	async _deleteTemplate (event) {
		event.stopImmediatePropagation();
		const id = getClosestData(event, "templateId");
		await this.actor.removeTemplate(id);
	}

	async _jumpToTemplate(event) {
		event.stopImmediatePropagation();
		const id = getClosestData(event, "templateId");
		const actors = await CityHelpers.getAllActorsByType("threat");
		actors.find(x => x.id == id)?.sheet?.render(true);
	}

	//Override
	async _onDropActor(_event, o) {
		switch (o.type) {
			case "Actor":
				const actor = CityDB.getActorById(o.id);
				switch (actor.type) {
					case "threat":
						if (this.actor.hasTemplate(o.id))
							return;
						this.actor.addTemplate(o.id);
						break;
					default:
						break;
				}
		}
	}


} //end of class
