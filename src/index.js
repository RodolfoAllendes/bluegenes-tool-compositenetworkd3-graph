'use strict';
import { CompositeNetworkD3 } from './CompositeNetworkD3.js';

// make sure to export main, with the signature
function main(el, service, imEntity, state, config, navigate) {
	if (!state) state = {};
	if (!el || !service || !imEntity || !state || !config) {
		throw new Error('Call main with correct signature');
	}
	// initialize the TMService	
	let imService = new imjs.Service(service);
	// query for initial data
	let query = {
		from: 'Gene',
		select: ['primaryIdentifier', 'symbol'],
		where: [{ path: 'id', op: 'one of', values: imEntity.Gene.value }]
	};
	
	Promise.all([
		imService.fetchModel(), 
		imService.records(query)]
	).then(([model,genes]) => {
		// create the Composite Network instance
		window.CompositeNetwork = new CompositeNetworkD3(model, genes, navigate);

		// add compounds
		let compoundQuery = {
			from: 'Gene',
			select: [
				'primaryIdentifier',
				'symbol',
				'proteins.compounds.compound.identifier',
				'proteins.compounds.compound.name'
			],
			where: [
				{ path: 'id', op: 'one of',	values: imEntity.Gene.value	}
			]
		};
		imService.records(compoundQuery).then(records => {
			let data = [];
			records.forEach(gene => {
				gene.proteins[0].compounds.map(cpd => {
					data.push({
						dbid: cpd.compound.objectId,	
						id: cpd.compound.identifier, 
						symbol: cpd.compound.name,
						parent: gene.objectId 
					});
				});
			});
			let grouped = data.length > 10 ? true : false;
			window.CompositeNetwork.addData('Compound', data, 'lime', 'hexagon', grouped);
		});
		
		// add miRNA
		// if(sourceNode.miRNAInteractions !== undefined){
		// 	let miRNA = sourceNode.miRNAInteractions.map(miR => {
		// 		return { dbid: miR.miRNA.objectId, id: miR.miRNA.primaryIdentifier, symbol: miR.miRNA.symbol };
		// 	});
		// 	this.network.addNodes('miRNA', miRNA, sourceNode.objectId, 'Gene');
		// }
		// this.network.addLayer('miRNA', 'cyan', 'triangle', false, true);

		// PPI interactions
		// if(sourceNode.interactions !== undefined){
		// 	let ppi = sourceNode.interactions.map(g2 => {
		// 		return { dbid: g2.gene2.objectId, id: g2.gene2.primaryIdentifier, symbol: g2.gene2.symbol };
		// 	});
		// 	this.network.addNodes('PPI', ppi);
		// }
		// this.network.addLayer('PPI', 'LightGray', 'ellipse', false, false);

		// add transcription factors
		let tfQuery = {
			from: 'Gene',
			select: [
				'primaryIdentifier',
				'symbol',
				'transcriptionalRegulations.targetGene.primaryIdentifier',
				'transcriptionalRegulations.targetGene.symbol',
				'transcriptionalRegulations.dataSets.name'
			],
			where: [
				{ path: 'transcriptionalRegulations.targetGene.id', op: 'one of', values: imEntity.Gene.value }
			]
		};
		imService.records(tfQuery).then(records => {
			let data = records.map(tf => {
				return {
					dbid: tf.objectId,
					id: tf.primaryIdentifier,
					symbol: tf.symbol,
					parent: tf.transcriptionalRegulations[0].targetGene.objectId
				};
			}); 
			let grouped = data.length > 10 ? true : false;
			window.CompositeNetwork.addData('TF', data, 'LightGreen', 'square', grouped);
		});
	});

	// 	let query = new imjs.Query({ model });

	// 	query.adjustPath('Gene');
	// 	query.select([
	// 		'primaryIdentifier',
	// 		'symbol',
			
	// 		'miRNAInteractions.miRNA.primaryIdentifier',
	// 		'miRNAInteractions.miRNA.symbol',

	// 		'interactions.gene2.primaryIdentifier',
	// 		'interactions.gene2.symbol'
	// 	]);
	// 	query.addConstraint(
	// 		{ path: 'id', op: 'one of',	values: imEntity.Gene.value	},
	// 	);
	// 	query.addJoin('miRNAInteractions');
	// 	query.addJoin('interactions');

	el.innerHTML = `
		<div class="rootContainer">
			<div id="compositeNetworkD3-graph" class="targetmineGraphDisplayer">
				<svg id="canvas_compositeNetwork" class="targetmineGraphSVG">
						<g id="background"></g>
						<g id="edges"></g>
						<g id="nodes"></g>
				</svg>
			
				<div id="rightColumn_compositeNetwork" class="rightColumn">
					<div id="interactions-div" class="flex-table">	
						<label>Interaction Types:</label>
						<div id="interactions-pci" class="flex-row">
							<input id="cb-pci" class="displayCB" type="checkbox" data-layer="Compound"></input>
							<label class="row-label">PCIs</label>
						</div>
						
						<div id="interactions-tf" class="flex-row">
							<input id="cb-tf" class="displayCB" type="checkbox" data-layer="TF"></input>
							<label class="row-label">TF targets<label>
						</div>
						
						<div id="interactions-ppi" class="flex-row">
							<input id="cb-ppi" class="displayCB" type="checkbox" data-layer="Interactions"></input>
							<label class="row-label">PPIs (HCDP)</label>
						</div>
						<div id="interactions-mti" class="flex-row">
							<input id="cb-mti" class="displayCB" type="checkbox" data-layer="miRNA"></input>
							<label class="row-label">MTIs</label>
						</div>
					</div>
					<div id="information-div" class="flex-table">
						<div id="nodes-groups" class="flex-row">
							<input id="cb-nodeGroup" class="nodeCB" type="checkbox" data-layer="NodeGroup" disabled></input>
							<label class="row-label">Grouped Nodes</label>
						</div>
						<label>Node Information:</label>
						<div id="nodeLayer-div" class="flex-row">
							<label class="row-label">Click on a node to see details...</label>
						</div>
						<div id="nodeSymbol-div" class="flex-row">
							<label class="row-label"></label>
						</div>
						<div id="nodeId-div" class="flex-row">
							<label class="row-label"></label>
						</div>
					</div>
				</div>
				<div id="modal_compositeNetwork" class="targetmineGraphModal">
				</div>
			</div>
		</div>
	`;
}

export { main };
