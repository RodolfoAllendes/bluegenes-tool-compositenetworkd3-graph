'use strict';
import { MultiLayerNetwork } from './MultiLayerNetwork';

const d3 = require('d3');

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

		this.width = parseInt(d3.select('#canvas_compositeNetwork').style('width'));
		this.height = parseInt(d3.select('#canvas_compositeNetwork').style('height'));

		this.plot();
	}


	plot(){
		let [w,h] = this.network.setNodesPositions(this.width, this.height);
		if(this.width !== w || this.height !== h){
			this.width = w;
			this.height = h;
		}

		this.network.plotBackground('#background', this.width);

		this.network.plotNodes();
		
		/* finally change the viewbox of the svg */
		d3.select('svg')
			.attr('viewBox', '0 0'+
				' '+ this.width + 
				' '+ this.height )
		;
	}


}