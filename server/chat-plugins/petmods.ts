import { Utils, FS, Net } from '../../lib';

export const commands: Chat.ChatCommands = {
	chatbats: 'chatbats',
	chatbats(target, room, user, connection, cmd) {
		if (!this.runBroadcast()) return;
		const battle = room?.battle;
		const args = target.split(',');
		if (!args[0]) return this.parse(`/help`);

		const { dex } = this.splitFormat(target, true);

		const searchResults = dex.dataSearch(args[0], ['Pokedex']);

		if (!searchResults?.length) {
			throw new Chat.ErrorMessage(`No Pok\u00e9mon named '${args[0]}' was found${Dex.gen > dex.gen ? ` in Gen ${dex.gen}` : ""}. (Check your spelling?)`);
		}

		let inexactMsg = '';
		if (searchResults[0].isInexact) {
			inexactMsg = `No Pok\u00e9mon named '${args[0]}' was found${Dex.gen > dex.gen ? ` in Gen ${dex.gen}` : ""}. Searching for '${searchResults[0].name}' instead.`;
		}
		const species = dex.species.get(searchResults[0].name);
		const formatName = `chatbats`;
		const format = dex.formats.get(formatName);

		const movesets = [];
		let setCount = 0;
		} else {
			const setsToCheck = [species];
			if (dex.gen >= 8 && !isNoDMax) setsToCheck.push(dex.species.get(`${args[0]}gmax`));
			if (species.otherFormes) setsToCheck.push(...species.otherFormes.map(pkmn => dex.species.get(pkmn)));
			if ([2, 3, 4, 5, 6, 7, 9].includes(dex.gen)) {
				for (const pokemon of setsToCheck) {
					const data = getSets(pokemon, format.id);
					if (!data) continue;
					const sets = data.sets;
					const level = data.level || getLevel(pokemon, format);
					let buf = `<span class="gray">Moves for ${pokemon.name} in ${format.name}:</span><br/>`;
					buf += `<b>Level</b>: ${level}`;
					for (const set of sets) {
						buf += `<details class="details"><summary>${set.role}</summary>`;
						if (dex.gen === 9) {
							buf += `<b>Tera Type${Chat.plural(set.teraTypes)}</b>: ${set.teraTypes.join(', ')}<br/>`;
						} else if (([2, 3, 4, 5, 6, 7].includes(dex.gen)) && set.preferredTypes) {
							buf += `<b>Preferred Type${Chat.plural(set.preferredTypes)}</b>: ${set.preferredTypes.join(', ')}<br/>`;
						}
						buf += `<b>Moves</b>: ${set.movepool.sort().map(formatMove).join(', ')}<br/>`;
						if (set.abilities) {
							buf += `<b>Abilit${Chat.plural(set.abilities, 'ies', 'y')}</b>: ${set.abilities.sort().join(', ')}`;
						}
						buf += '</details>';
						setCount++;
					}
					movesets.push(buf);
				}
			} else {
				for (let pokemon of setsToCheck) {
					let data = getData(pokemon, format.name);
					if (!data && isNoDMax) {
						pokemon = dex.species.get(pokemon.id + 'gmax');
						data = getData(pokemon, format.name);
					}
					if (!data) continue;
					if (!data.moves || pokemon.isNonstandard === 'Future') continue;
					let randomMoves = data.moves;
					const level = data.level || getLevel(pokemon, format);
					if (isDoubles && data.doublesMoves) randomMoves = data.doublesMoves;
					if (isNoDMax && data.noDynamaxMoves) randomMoves = data.noDynamaxMoves;
					const m = randomMoves.slice().sort().map(formatMove);
					movesets.push(
						`<details class="details">` +
						`<summary><span class="gray">Moves for ${pokemon.name} in ${format.name}:</span></summary>` +
						(level ? `<b>Level</b>: ${level}<br>` : '') +
						`${m.join(`, `)}</details>`
					);
					setCount++;
				}
			}
		}

		if (!movesets.length) {
			this.sendReply(inexactMsg);
			throw new Chat.ErrorMessage(`Error: ${species.name} has no Random Battle data in ${format.name}`);
		}
		let buf = movesets.join('<hr/>');
		if (setCount <= 2) {
			buf = buf.replace(/<details>/g, '<details open>');
		}
		this.sendReply(inexactMsg);
		this.sendReplyBox(buf);
	},
