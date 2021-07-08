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

		// graphical properties of the nodes
		this.r = 15;
		this.nodeMargin = 10;
		this.nodeBB = 50;

		this.width = parseInt(d3.select('#canvas_compositeNetwork').style('width'));
		this.height = parseInt(d3.select('#canvas_compositeNetwork').style('height'));
		
		// add hard-coded networks from the initial query
		this.network.addLayer('Gene', 'yellow', 'ellipse', true);
		this.network.addLayer('Compound', 'lime', 'hexagon', false);
		this.network.addLayer('miRNA', 'cyan', 'triangle', true);
		this.network.addLayer('PPI', 'LightGray', 'ellipse', false);

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

		this.initMarkers();
		this.initFunctions();

		this.plot();
	}

	initFunctions(){
		let self = this;
		d3.selectAll('#rightColumn_compositeNetwork input')
			.on('click', function(){ self.setDisplay(this.dataset.layer, this.checked); });
	}

	initMarkers(){
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
	}

	plot(){
		let [w,h] = this.network.setNodesPositions(this.width, this.height, this.nodeBB);
		if(this.width !== w || this.height !== h){
			this.width = w;
			this.height = h;
		}
		
		// this.plotBackground('#background', this.width);

		// this.plotEdges();
		this.plotNodes();

		
		/* finally change the viewbox of the svg */
		d3.select('svg')
			.attr('viewBox', '0 0'+
				' '+ this.width + 
				' '+ this.height )
		;
	}

	plotBackground(graph, width){
		/* filter out only displayable layers */
		// let layers = [...this.network.layers.values()];
		/* plot a series of layer backgrounds */
		d3.select(graph).selectAll('rect')
			.data([...this.network.layers.values()])
			.join('rect')
				.attr('x', 0)
				.attr('y', d => d.dims.ymin)
				.attr('width', width)
				.attr('height', d => d.dims.ymax - d.dims.ymin)
				.attr('fill', d => d.color)
				.style('opacity', 0.1)
		;
	}

	plotEdges(){
		const edges = [...this.network.edges.values()].map(edge => {
			let s = this.network.nodes.get(edge.source);
			let t = this.network.nodes.get(edge.target);
			return { source: [s.x, s.y+this.r], target: [t.x, t.y-this.r-2]  };
		});
		

		d3.select('#edges').selectAll('path')
			.data(edges)
			.enter().append('path')
				.attr('class', 'arrow')
				.attr('marker-end', 'url(#arrow)')
				// .attr('x1',d => d.sx)
				// .attr('x2',d => d.tx)
				// .attr('y1',d => d.sy)
				// .attr('y2',d => d.ty)
				.attr('d', d3.linkVertical()
					.source(d => d.source)
					.target(d => d.target)
				)
				.attr('stroke', 'black')
				.style('opacity', 0.2)
			.exit().remove();
	}

	/**
	 * 
	 */
	plotNodes(){
		let self = this;
		d3.select('#nodes').selectAll().remove();
		this.network.vm.forEach((eles,layer) => {
			// fetch node's coordinates
			const nodes = [...eles].map(node => {
				let n = this.network.nodes.get(node);
				return {x: n.x, y:n.y, id: node};
			});
			// and layer's color 
			let color = this.network.layers.get(layer).color;
			d3.select('#nodes').append('g')
				.attr('id', 'layer-'+layer);
			
			// group the nodes within a single layer
			d3.select('#layer-'+layer).selectAll('g')
				.data(nodes)
				.enter().append('g')
					.append('circle')
					.attr('r',this.r)
					.attr('fill', color)
					.attr('stroke', 'black')
					.attr('cx', d => d.x)
					.attr('cy', d => d.y)
					.attr('id', d => d.id)
					.on('click', function(){
						let node = self.network.nodes.get(parseInt(this.id));
						window.alert(node.id, node.symbol);
					})
					
				.exit().remove()
			;
		});
	}

	/**
	 * 
	 * @param {*} layer 
	 */
	setDisplay(layer, display){
		if(display)
			this.network.displayLayers.add(layer);
		else
			this.network.displayLayers.delete(layer);
	}


}