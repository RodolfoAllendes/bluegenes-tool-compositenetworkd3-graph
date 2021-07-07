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
		
		// add hard-coded networks from the initial query
		this.network.addLayer('Gene', 'yellow', 'ellipse', true);
		this.network.addLayer('Compound', 'lime', 'hexagon', true);
		this.network.addLayer('miRNA', 'cyan', 'triangle', true);
		this.network.addLayer('PPI', 'LightGray', 'ellipse', true);

		// add the source gene list to the network
		this.network.parseNodesAndEdges(undefined, geneList, 
			'Gene', 
			'objectId', 
			['primaryIdentifier', 'symbol']
		);

		// add all the nodes and edges found starting from the initial gene list
		geneList.forEach(sourceNode => {
			// add compound interaction - if any available 
			if(sourceNode.proteins !== undefined ){
				this.network.parseNodesAndEdges(sourceNode.objectId, sourceNode.proteins[0].compounds,
					'Compound', 
					'objectId',
					[ ['compound', 'originalId'], ['compound', 'name'] ]
				);
			}
			
			// miRNA interactions
			if(sourceNode.miRNAInteractions !== undefined){
				this.network.parseNodesAndEdges(sourceNode.objectId, sourceNode.miRNAInteractions,
					'miRNA',
					'objectId',
					[ ['miRNA', 'primaryIdentifier'], ['miRNA', 'symbol'] ]
				);
			}

			// PPI interactions
			if(sourceNode.interactions !== undefined){
				this.network.parseNodesAndEdges(sourceNode.objectId, sourceNode.interactions,
					'PPI',
					'objectId',
					[ ['gene2', 'primaryIdentifier'], ['gene2', 'symbol'] ]
				);
			}
		});

		this.width = parseInt(d3.select('#canvas_compositeNetwork').style('width'));
		this.height = parseInt(d3.select('#canvas_compositeNetwork').style('height'));
		
		d3.select('#canvas_compositeNetwork').append('defs')
			.append('marker')
				.attr('id', 'arrow')
				.attr('viewBox', '0 -5 10 10')
				.attr('refX', 5)
				.attr('refY', 0)
				.attr('markerWidth', 4)
				.attr('markerHeight', 4)
				.attr('orient', 'auto')
				.append('path')
					.attr('d', 'M0,-5L10,0L0,5')
					.attr('class','arrowHead');


		this.plot();
	}


	plot(){
		let [w,h] = this.network.setNodesPositions(this.width, this.height);
		if(this.width !== w || this.height !== h){
			this.width = w;
			this.height = h;
		}
		
		// this.network.plotBackground('#background', this.width);

		this.network.plotEdges();

		this.network.plotNodes();

		
		/* finally change the viewbox of the svg */
		d3.select('svg')
			.attr('viewBox', '0 0'+
				' '+ this.width + 
				' '+ this.height )
		;
	}


}