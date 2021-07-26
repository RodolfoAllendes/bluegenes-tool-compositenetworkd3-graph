'use strict';
import { CompositeNetworkD3 } from './CompositeNetworkD3.js';

// make sure to export main, with the signature
function main(el, service, imEntity, state, config, navigate) {
	if (!state) state = {};
	if (!el || !service || !imEntity || !state || !config) {
		throw new Error('Call main with correct signature');
	}
	
	let imService = new imjs.Service(service);
	imService.fetchModel().then(model => {
		let query = new imjs.Query({ model });
		query.adjustPath('Gene');
		query.select([
			'primaryIdentifier',
			'symbol',
			
			'proteins.compounds.compound.identifier',
			'proteins.compounds.compound.name',

			'miRNAInteractions.miRNA.primaryIdentifier',
			'miRNAInteractions.miRNA.symbol',

			'interactions.gene2.primaryIdentifier',
			'interactions.gene2.symbol'
		]);
		query.addConstraint({
			path: 'id',
			op: 'one of',
			values: imEntity.Gene.value
		});
		query.addJoin('miRNAInteractions');
		query.addJoin('proteins');
		query.addJoin('interactions');

		return Promise.all([model, imService.records(query)]);
	}).then(([model, rows]) => {
		window.CompositeNetwork = new CompositeNetworkD3(model, rows, navigate);
	});

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
							<input id="cb-tf" class="displayCB" type="checkbox" data-layer="Transcription" disabled></input>
							<label class="row-label">TF targets<label>
						</div>
						
						<div id="interactions-ppi" class="flex-row">
							<input id="cb-ppi" class="displayCB" type="checkbox" data-layer="Interactions" disabled></input>
							<label class="row-label">PPIs (HCDP)</label>
						</div>
						<div id="interactions-mti" class="flex-row">
							<input id="cb-mti" class="displayCB" type="checkbox" data-layer="miRNA"></input>
							<label class="row-label">MTIs</label>
						</div>
					</div>
					<div id="information-div" class="flex-table">
						<div id="nodes-groups" class="flex-row">
							<input id="cb-nodeGroup" class="nodeCB" type="checkbox" data-layer="NodeGroup"></input>
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
