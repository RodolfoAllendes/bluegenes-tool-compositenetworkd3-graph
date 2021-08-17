'use strict';
import { MultiLayerNetwork } from './MultiLayerNetwork';
import { Sortable } from 'sortablejs';
const d3 = require('d3');

export class CompositeNetworkD3{
	
	/**
	 * constructor
	 * @param {object} model 
	 * @param {object} geneList 
	 * @param {function} navigate
	 */
	constructor(model, geneList, navigate) {
		Sortable.create(document.getElementById('interactions-div'),{});
		this.model = model;
		this.navigate = navigate;
		
		/** process initial data data into a MultiLayer Network instance */
		this.network = new MultiLayerNetwork();
		this.network.addLayer('Gene', 'yellow', 'ellipse', true);
		// add the source gene list to the network
		let genes = geneList.map(g => {
			return { 
				dbid: g.objectId, 
				id: g.primaryIdentifier,	
				symbol: g.symbol, 
				linkedTo: undefined
			};
		});
		this.network.addNodes('Gene', genes);
		
		/** initialize interface and interaction handlers */
		// this.initResizeHandler();
		this.initCheckboxHandler();

		this._width = parseInt(d3.select('#canvas_compositeNetwork').style('width'));
		this._height= parseInt(d3.select('#canvas_compositeNetwork').style('height'));
		
		this.screenZoom = d3.zoom()
			.extent([[0,0],[this._width, this._height]])
			.on('zoom', this.zoomed);

		this.nodeDrag = d3.drag()
			.subject((event,d) => d == null ? {x: event.x, y: event.y} : d.network = this.network)
			.on('start', this.nodeDragStarted)
			.on('drag', this.nodeDragged)
			.on('end', this.nodeDragEnded);
		
		/** plot the initial version of the graph */
		d3.select('#canvas_compositeNetwork')
			.attr('viewBox', [0,0,this._width,this._height])
			.call(this.screenZoom);
		
		// [this.r, this._width, this._height] = this.network.setNodesPositions(
		// 	this._width, 
		// 	this._height
		// );
		this.r = this.network.setNodesPositions(this._width, this._height);
		this.plot();
		
	}

	/**
	 * Add nodes to the network
	 * @param {string} layer 
	 * @param {object} data 
	 * @param {string} color 
	 * @param {string} shape 
	 * @param {boolean} visible 
	 * @param {boolean} grouped 
	 */
	addData(layer, data, color, shape, grouped=true, visible=false){
		this.network.addLayer(layer, color, shape, visible);
		this.network.addNodes(layer, data);
		
		if(grouped){
			this.network.groupNodesByLayer(layer);
		}
		
		this.r = this.network.setNodesPositions(this._width, this._height);
		if(visible){
			this.plot();
		}
			
	}

	/**
	 * 
	 */
	initCheckboxHandler(){
		let self = this;
		d3.selectAll('#rightColumn_compositeNetwork input.displayCB')
			.on('change', function(){ 
				self.network.setDisplayLayer(this.dataset.layer, this.checked);
				// if(this.checked)
				// 	self.network.displayLayers.add(this.dataset.layer);
				// else
				// 	self.network.displayLayers.delete(this.dataset.layer);
			
				// [self.r, self._width, self._height] = self.network.setNodesPositions(
				// 	self._width, 
				// 	self._height, 
				// );
				// d3.select('#canvas_compositeNetwork')
				// 	.call(self.screenZoom.transform, d3.zoomIdentity)
				// 	.call(self.screenZoom);
				self.plot();
			});
	}

	/**
	 * 
	 */
	initResizeHandler(){
		window.addEventListener('resize', () => {
			// replot the graph if more (or less) window space is available for the svg
			let w = parseInt(d3.select('#canvas_compositeNetwork').style('width'));
			
			this._height= parseInt(d3.select('#canvas_compositeNetwork').style('height'));
			// this.r = this.network.setNodesPositions(
			// 	this._width, 
			// 	this._height,
			// )[0];

			this._width = w > this._width ? w : this._width;
			d3.select('#canvas_compositeNetwork')
				// .call(this.screenZoom.transform, d3.zoomIdentity)
				// .call(this.screenZoom)
				// .transition()
				// .duration(1000)
				.attr('viewBox', [0, 0, this._width, this._height]);

			this.plot();	
		});
	}

	/**
	 * 
	 */
	nodeDragStarted() {
		d3.select(this).attr('stroke', 'black');
	}

	/**
	 * 
	 * @param {*} event 
	 */
	nodeDragged(event,d) {
		let x = event.x < d.r ? d.r : event.x > d.xmax-d.r ? d.xmax-d.r : event.x;
		let y = event.y < d.ymin+d.r ? d.ymin+d.r : event.y > d.ymax-d.r ? d.ymax-d.r : event.y;
		
		/* find edges associated to this node */
		d3.selectAll('#canvas_compositeNetwork #edges line')
			.filter(function(line){
				return line.source.id === d.id;
			})
			.raise()
			.attr('x1', d.x1 = x)
			.attr('y1', d.y1 = y)
			.attr('stroke', 'black');

		d3.selectAll('#canvas_compositeNetwork #edges line')
			.filter(function(line){
				return line.target.id === d.id;
			})
			.raise()
			.attr('x2', d.x2 = x)
			.attr('y2', d.y2 = y)
			.attr('stroke', 'black');
		
		d3.select(this)
			.raise()
			.select('circle')
				.attr('cx', d.x = x)
				.attr('cy', d.y = y);
		
		d3.select(this).select('text')
			.attr('dx', d.dx = x)
			.attr('dy', d.dy = y);
	}

	/**
	 * 
	 */
	nodeDragEnded(event,d) {
		d3.select(this).attr('stroke', null);
		d3.selectAll('#canvas_compositeNetwork #edges line')
			.filter(function(line){
				return line.source.id === d.id || line.target.id === d.id;
			})
			.attr('stroke', 'lightGray');
		// NEED TO PERSIST THE FINAL COORDINATES TO THE NETWORK
		d.network.setNodePosition(d.id,d.layer,d.x,d.y-d.shift);
		
	}
	
	/**
	 * 
	 */
	plot(){
		let h = this.plotBackground('#canvas_compositeNetwork #background');
		d3.select('#canvas_compositeNetwork')
			.attr('viewBox', [0, 0, this._width, h]);

		// this.plotEdges('#canvas_compositeNetwork #edges');
		this.plotNodes('#canvas_compositeNetwork #nodes');
	}

	/**
	 * Plot a background to each layer in the graph
	 * @param {} graph 
	 * @param {*} width 
	 */
	plotBackground(graph){
		/* filter out only displayable layers */
		let data = this.network.getDisplayLayers();
		/* plot a series of layer backgrounds */
		d3.select(graph).selectAll('rect')
			.data(data)
			.join('rect')
				.attr('x', 0)
				.attr('y', d => d.shift)
				.attr('width', d => d.width)
				.attr('height', d => d.height)
				.attr('fill', d => d.color)
				.style('opacity', 0.1);

		return data.reduce((p,c) => {
			return p + c.height;
		},0);
	}

	/**
	 * Plot the edges in the graph
	 * @param {} graph
	 */
	plotEdges(graph){
		let data = this.network.getDisplayEdges();
		d3.select(graph).selectAll('line')
			.data(data)
			.join('line')
				.attr('x1', d => d.source.x)
				.attr('x2', d => d.target.x)
				.attr('y1', d => d.source.y)
				.attr('y2', d => d.target.y)
				.attr('sid', d => d.source.id)
				.attr('tid', d => d.target.id)
				.attr('stroke', 'lightGray');
	}

	/**
	 * Plot the nodes in the graph
	 * @param {} graph
	 */
	plotNodes(graph){
		let self = this;
		let data = this.network.getDisplayNodes(this.r);
		
		// clear previous nodes
		d3.select(graph).selectAll('g').remove();
		// plot the nodes
		let g = d3.select(graph).selectAll('g')
			.data(data)
			.join('g')
				.call(self.nodeDrag, 'holamundo')
				.on('click', function(d,i){
					d3.select('#nodeLayer-div label')
						.text(i.layer);
					d3.select('#nodeSymbol-div label')
						.text(i.symbol);
					if(d.defaultPrevented) return;
				});

		g.append('circle')
			.attr('r', this.r)
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

	/**
	 * 
	 * @param {*} target 
	 */
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

	/**
	 * 
	 * @param {zoomEvent} t The zoom event as defined in the D3 library
	 */
	zoomed(t){
		d3.select('g#cursor')
			.attr('transform', t.transform);
	}
}


