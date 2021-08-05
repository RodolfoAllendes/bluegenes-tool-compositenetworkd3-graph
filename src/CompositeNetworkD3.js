'use strict';
import { MultiLayerNetwork } from './MultiLayerNetwork';
const d3 = require('d3');

export class CompositeNetworkD3{
	
	/**
	 * constructor
	 * @param {object} model 
	 * @param {object} geneList 
	 * @param {function} navigate
	 */
	constructor(model, geneList, navigate) {
		this.model = model;
		this.navigate = navigate;
		
		/** process initial data data into a MultiLayer Network instance */
		this.network = new MultiLayerNetwork();
		this.network.addLayer('Gene', 'yellow', 'ellipse', false, true);
		// add the source gene list to the network
		let genes = geneList.map(g => {
			return { 
				dbid: g.objectId, 
				id: g.primaryIdentifier,	
				symbol: g.symbol, 
				parent: undefined
			};
		});
		this.network.addNodes('Gene', genes);
		
		/** initialize interface and interaction handlers */
		this.initResizeHandler();
		this.initCheckboxHandler();

		this._width = parseInt(d3.select('#canvas_compositeNetwork').style('width'));
		this._height= parseInt(d3.select('#canvas_compositeNetwork').style('height'));
		
		this.screenZoom = d3.zoom()
			.extent([[0,0],[this._width, this._height]])
			.on('zoom', this.zoomed);

		this.nodeDrag = d3.drag()
			.on('start', this.nodeDragStarted)
			.on('drag', this.nodeDragged)
			.on('end', this.nodeDragEnded);
		
		/** plot the initial version of the graph */
		d3.select('#canvas_compositeNetwork')
			.attr('viewBox', [0,0,this._width,this._height])
			.call(this.screenZoom);
		
		[this.r, this._width, this._height] = this.network.setNodesPositions(
			this._width, 
			this._height
		);

		this.plot();
	}

	/**
	 * 
	 * @param {string} layer 
	 * @param {object} data 
	 * @param {string} color 
	 * @param {string} shape 
	 * @param {boolean} visible 
	 * @param {boolean} grouped 
	 */
	addData(layer, data, color, shape, grouped=true, visible=false){
		this.network.addLayer(layer, color, shape, grouped, visible);
		this.network.addNodes(layer, data);
		if(grouped){
			this.network.groupNodesByLayer(layer);
		}
		if(visible)
			console('shold replot?');
	}

	/**
	 * 
	 */
	initCheckboxHandler(){
		let self = this;
		d3.selectAll('#rightColumn_compositeNetwork input.displayCB')
			.on('change', function(){ 
				if(this.checked)
					self.network.displayLayers.add(this.dataset.layer);
				else
					self.network.displayLayers.delete(this.dataset.layer);
			
				[self.r, self._width, self._height] = self.network.setNodesPositions(
					self._width, 
					self._height, 
				);
				d3.select('#canvas_compositeNetwork')
					.call(self.screenZoom.transform, d3.zoomIdentity)
					.call(self.screenZoom);
				self.plot();
			});
	}

	/**
	 * 
	 */
	initResizeHandler(){
		window.addEventListener('resize', () => {
			// replot the graph if more (or less) window space is available for the svg
			this._width = parseInt(d3.select('#canvas_compositeNetwork').style('width'));
			this._height= parseInt(d3.select('#canvas_compositeNetwork').style('height'));
			this.r = this.network.setNodesPositions(
				this._width, 
				this._height,
			)[0];

			d3.select('#canvas_compositeNetwork')
			// 	.call(this.zoom.transform, d3.zoomIdentity)
			// 	.call(this.zoom)
				.transition()
				.duration(1000)
				.attr('viewBox', [0, 0, this._width, this._height]);

			this.plot();	
		});
	}

	nodeDragStarted() {
		d3.select(this).attr('stroke', 'black');
	}

	nodeDragged(event) {
		let g = d3.select(this)
			.raise();

		g.select('circle')
			.attr('cx', d => {
				if(event.x < d.r) return d.r;
				if(event.x > d.xmax-d.r) return d.xmax-d.r;
				return event.x;
			})
			.attr('cy', d => {
				if(event.y < d.ymin+d.r) return d.ymin+d.r;
				if(event.y > d.ymax-d.r) return d.ymax-d.r;
				return event.y;
			});
			
		g.select('text')
			.attr('dx', d => {
				if(event.x < d.r) return d.r;
				if(event.x > d.xmax-d.r) return d.xmax-d.r;
				return event.x;
			})
			.attr('dy', d => {
				if(event.y < d.ymin+d.r) return d.ymin+d.r;
				if(event.y > d.ymax-d.r) return d.ymax-d.r;
				return event.y;
			});
	}

	nodeDragEnded() {
		d3.select(this).attr('stroke', null);
	}

	
	/**
	 * 
	 */
	plot(){
		this.plotBackground('#background', this._width);
		// this.plotEdges('#edges', d3.select('#cb-nodeGroup').property('checked'));
		this.plotNodes('#nodes');
	}

	/**
	 * Plot a background to each layer in the graph
	 * @param {} graph 
	 * @param {*} width 
	 */
	plotBackground(graph, width){
		/* filter out only displayable layers */
		let data = [];
		this.network.displayLayers.forEach(dl => {
			data.push(this.network.layers.get(dl));
		},this);
		
		/* plot a series of layer backgrounds */
		d3.select(graph).selectAll('rect')
			.data(data)
			.join('rect')
				.attr('x', 0)
				.attr('y', d => d.dims.ymin)
				.attr('width', width)
				.attr('height', d => d.dims.ymax - d.dims.ymin)
				.attr('fill', d => d.color)
				.style('opacity', 0.1);
	}

	/**
	 * Plot the edges in the graph
	 * @param {} graph
	 * @param {boolean} groups display groups of nodes
	 */
	plotEdges(graph, groups){
		let data = [];

		if(this.network.displayLayers.size >= 2){
			this.network.displayLayers.forEach(dl => {
				if(groups && this.network.groupedLayers.has(dl)){
					this.network.groupedEdges.get(dl).forEach(edge => {
						if(this.network.displayLayers.has(edge.sourceLayer)){
							let s = this.network.nodes.get(edge.source);
							let t = this.network.groupedNodes.get(dl).get(edge.target);
							data.push({
								source: [s.x, s.y],
								target: [t.x, t.y]
							});
						}
					});
				}
				else{
					this.network.edges.get(dl).forEach(edge => {
						let s = this.network.nodes.get(edge.source);
						let t = this.network.nodes.get(edge.target);
						data.push({ 
							source: [s.x, s.y], 
							target: [t.x, t.y] 
						});
					});
				}
			});
		}

		d3.select(graph).selectAll('line')
			.data(data)
			.join('line')
				.attr('x1', d => d.source[0])
				.attr('x2', d => d.target[0])
				.attr('y1', d => d.source[1])
				.attr('y2', d => d.target[1])
				.attr('stroke', 'lightGray');
	}

	/**
	 * Plot the nodes in the graph
	 * @param {} graph
	 */
	plotNodes(graph){
		let self = this;
		let data = [];
		this.network.displayLayers.forEach(dl=>{
			// fetch the layer's color 
			let color = this.network.layers.get(dl).color;
			let dims = this.network.layers.get(dl).dims;
			// and the position of each node
			[...this.network.vm.get(dl).values()].map(node =>{
				let n = this.network.nodes.get(node);
				data.push({
					layer: dl,
					r: this.r,
					ymin:dims.ymin,
					ymax:dims.ymax,
					xmax: this._width,
					symbol: n.symbol, 
					x: n.x, 
					y: n.y, 
					id: node, 
					color 
				});
			});
		},this);
		
		// clear previous nodes
		d3.select(graph).selectAll('g').remove();
		// plot the nodes
		let g = d3.select(graph).selectAll('g')
			.data(data)
			.join('g')
				.call(self.nodeDrag)
				.on('click', function(d,i){
					d3.select('#nodeLayer-div label')
						.text(i.layer);
					d3.select('#nodeSymbol-div label')
						.text(i.symbol);
					if(d.defaultPrevented) return;
				});

		g.append('circle')
			.attr('r',this.r)
			.attr('cx', d => d.x)
			.attr('cy', d => d.y)
			.attr('fill', d => d.color)
			.attr('stroke', 'black')
			.attr('id', d => d.id);

		g.append('text')
			.text(d => d.symbol)
			.attr('dx', d => d.x)
			.attr('dy', d => d.y)
			.style('font-size', function(){ 
				let size = (1.7 * self.r - 8) / this.getComputedTextLength() * 24;
				size = size <0 ? 0 : size;
				return Math.min(self.r, size)+'px'; 
			})
			.style('text-anchor', 'middle');
	}

	setInfo(target){
		// target.layer
		d3.select('#nodeSymbol-div > label')
			.text('Symbol: '+target.symbol);
		d3.select('#nodeId-div > label')
			.text('View in TargetMine');
		// .on('click',function(){
		// 	console.log('nav',self.navigate);
		// });
	}

	updateCanvasSize(){

	}

	/**
	 * 
	 * @param {zoomEvent} t The zoom event as defined in the D3 library
	 */
	zoomed(t){
		d3.select('g#cursor')
			.attr('transform', t.transform);

		// d3.selectAll('#background rect')
		// 	.attr('transform', t.transform);
		// d3.selectAll('#edges line')
		// 	.attr('transform', t.transform);
		// d3.selectAll('#nodes circle')
		// 	.attr('transform', t.transform);
		// d3.selectAll('#nodes text')
		// 	.attr('transform', t.transform);
	}
}


