'use strict';
import { CompositeNetworkD3 } from './CompositeNetworkD3.js';

// make sure to export main, with the signature
function main(el, service, imEntity, state, config) {
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
			'organism.name',

			'proteins.compounds.compound.identifier',
			'proteins.compounds.compound.name',
			'proteins.compounds.compound.inchiKey',
			'proteins.compounds.compound.originalId',

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
		window.CompositeNetwork = new CompositeNetworkD3(model, rows);
	});

	el.innerHTML = `
		<div class="rootContainer">
			<div id="compositeNetworkD3-graph" class="targetmineGraphDisplayer">
				<svg id="canvas_compositeNetwork" class="targetmineGraphSVG"></svg>
			
				<div id="rightColumn_compositeNetwork" class="rightColumn">
					<div id="interactions-div" class="flex-table">	
						<label>Interaction Types:</label>
						<div id="interactions-tf" class="flex-row">
							<input id="cb-tf" type="checkbox"></input>
							<label class="row-label">TF targets<label>
						</div>
						<div>PCIs</div>
						<div>PPIs (HCDP)
						</div>
						<div>MTIs
						</div>
					</div>	
					<div>Info</div>
				</div>
				<div id="modal_compositeNetwork" class="targetmineGraphModal">
				</div>
			</div>
		</div>
	`;
}

export { main };
