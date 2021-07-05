'use strict';
import { MultiLayerNetwork } from './MultiLayerNetwork';

export class CompositeNetworkD3{
	
	/**
	 * constructor
	 * @param {object} model 
	 * @param {object} geneList 
	 */
	constructor(model, geneList) {
		this.model = model;
		this.geneList = geneList;
		// Initialize the list of nodes from the data retrieved from TargetMine
		this.network = new MultiLayerNetwork();
		
		this.network.addLayer('Gene', 'yellow', 'ellipse', true);
		this.network.parseNodes(geneList, 
			'Gene', 
			'objectId', 
			['primaryIdentifier', 'symbol']
		);

		this.network.addLayer('Compound', 'lime', 'hexagon', true);
		this.network.parseNodes(geneList[0].proteins[0].compounds,
			'Compound', 
			'objectId',
			[ ['compound', 'originalId'], ['compound', 'name'] ]
		);

		this.network.addLayer('miRNA', 'cyan', 'triangle', true);
		this.network.parseNodes(geneList[0].miRNAInteractions,
			'miRNA',
			'objectId',
			[ ['miRNA', 'primaryIdentifier'], ['miRNA', 'symbol'] ]
		);

		this.network.addLayer('PPI', 'LightGray', 'ellipse', true);
		this.network.parseNodes(geneList[0].interactions,
			'PPI',
			'objectId',
			[ ['gene2', 'primaryIdentifier'], ['gene2', 'symbol'] ]
		);

	// 	this.props.data.forEach((g) => {
	// 		nodes.set(g.objectId, { 
	// 			primaryIdentifier: g.primaryIdentifier,
	// 			symbol: g.symbol,
	// 			organism: g.organism.name
	// 		});
	// 		vm.add(g.objectId);
	// 	});
	// 	// initialize the state of the network
	// 	this.state = {
	// 		
	// 		nodes,
	// 		vm: new Map([['Gene', vm]]),
	// 		edges: new Map()
	// 	};
	}


}