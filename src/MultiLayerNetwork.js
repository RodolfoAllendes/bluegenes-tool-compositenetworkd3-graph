'use strict';

export class MultiLayerNetwork{
	constructor(){
		// structural properties for the network
		this.nodes = new Map();
		this.layers = new Map();
		this.vm = new Map();
		this.edges = new Map();

		this.displayLayers = new Set();//Array();
		this.displayedLayers = new Map();
	}

	/**
	 * Add the details for a new Layer to the network
	 * 
	 * @param {string} name 
	 * @param {string} color 
	 * @param {string} shape 
	 * @param {boolean} visible 
	 */
	addLayer(name, color, shape, visible=false){
		this.layers.set(name, {color, shape});
		this.displayedLayers.set(name, {display:visible});
		// if(visible) this.displayLayers.add(name)
	}

	/**
	 * Add nodes to a given Layer of the network
	 * 
	 * @param {String} layer 
	 * @param {Array} data 
	 */
	addNodes(layer, data){
		// retrieve current vm for the layer
		let vm = this.vm.get(layer) || new Map();
		data.forEach(ele => {
			// add general node information to the list (if required)
			if(!this.nodes.has(ele.dbid)){
				this.nodes.set(ele.dbid, {id: ele.id, symbol: ele.symbol});	
			}
			// and add more graphical information associated to the version of
			// the node in the current layer
			let linkedTo = ele.linkedTo !== undefined ? [[ele.linkedTo, ele.linkedLayer]] : []; 
			if(!vm.has(ele.dbid))
				vm.set(ele.dbid, { isGroup:false, linkedTo });
			else // if node is already in the network only update its parents
				vm.get(ele.dbid).linkedTo.push(...linkedTo);
		}, this);
		// update the vm element for the layer
		this.vm.set(layer, vm);
	}

	/**
	 * Add edges between  a single source node from a source layer, and a series 
	 * of target nodes belonging to a different layer
	 * @param {String} layer 
	 * @param {Array} data 
	 * @param {*} sourceNode 
	 * @param {*} sourceLayer 
	 */
	addEdges(layer, data, sourceNode=undefined, sourceLayer=undefined){
		// retrieve current vm for the layer
		let vm = this.vm.get(layer) || new Set();
		let edges = this.edges.get(layer) || new Map();
		data.forEach(ele => {
			// add the node to the list (if required)
			if(!this.nodes.has(ele.dbid)){
				let n = {
					id: ele.id, 
					symbol: ele.symbol, 
					...(sourceNode !== undefined && { parents: [sourceNode.toString()] } )
				};
				this.nodes.set(ele.dbid, n);
			}
			else{ // if node is already in the network only update its parents
				if(sourceNode !== undefined){
					this.nodes.get(ele.dbid).parents.push(sourceNode.toString());
				}
			}
			// add edges only if a source was identified 
			if(sourceNode !== undefined)
				edges.set(sourceNode+'-'+ele.dbid, {
					source: sourceNode, 
					target: ele.dbid,
					sourceLayer,
					targetLayer: layer
				});
			// add reference between layer and node
			vm.add(ele.dbid);
		}, this);
		this.vm.set(layer, vm); 
		this.edges.set(layer, edges);
	}

	/**
	 * 
	 * @returns 
	 */
	getDisplayEdges(){
		
		let data = [];
		
		this.displayLayers.forEach(dl => {

			let layer = this.vm.get(dl);
			layer.forEach((node,key) => {
				node.linkedTo.forEach(link => {
					let target = this.vm.get(link[1]).get(link[0]);
				
					data.push({
						source:{
							x: node.x,
							y: node.y,
							id: key,
							layer: dl
						},
						target: {
							x: target.x, y: target.y,
							id:	link[0],
							layer: link[1]
						}	
					});
				});

			});
		});
		return data;
	}

	getDisplayLayers(){
		let data = [];
		let shift = 0;
		[...this.displayedLayers.entries()].forEach( ([k,v]) => {
			if(v.display){
				let layer = this.layers.get(k);
				data.push({
					color: layer.color,
					width: layer.dims.width,
					height: layer.dims.height,
					shift
				});
				shift += layer.dims.height;
			}
		});
		return data;
	}

	/**
	 * 
	 */
	getDisplayNodes(r){
		let data = [];
		let shift = 0;
		[...this.displayedLayers.entries()].forEach( ([k,v]) => {
			if(v.display){
				// fetch the layer's color 
				let color = this.layers.get(k).color;
				let dims = this.layers.get(k).dims;
				// and the position of each node
				[...this.vm.get(k).entries()].map( ([node,pos]) =>{
					let n = this.nodes.get(node);
					data.push({
						layer: k,
						r,
						xmin: 0,
						xmax: dims.width,
						ymin: shift,
						ymax: shift+dims.height,
						symbol: n.symbol, 
						x: pos.x, 
						y: shift+pos.y, 
						id: node, 
						color,
						shift
					});
				});
				shift += dims.height;
			}
		},this);
		return data;
	}

	/**
	 * Define all 'group' nodes for a given layer.
	 * Based on the parents for each node in a layer, define groupings that 
	 * condense into a single element all those nodes that share the same parents.
	 * 
	 * @param {string} layerName the name of the layer to group
	 */
	groupNodesByLayer(layerName){
		let layer = this.vm.get(layerName);
		// we will generate a series of new 'grouped' nodes 
		let nodes = new Map();
		let newVm = new Map();
		
		[...layer.entries()].forEach(([nid,ndata]) => {
			// retrieve the node and remove it from the list of nodes
			const node = this.nodes.get(nid);
			this.nodes.delete(nid);
			// generate an id for the new node, based on the layer to witch it belongs
			// and the nodes it is connected to
			let p = parseInt(ndata.linkedTo.reduce((c,a) => a+c, ''));
			p += TSH(layerName);
			p = -Math.abs(p);
			
			if(!nodes.has(p)){
				// add new node
				nodes.set(p, { 
					'group': [node], 
					'linkedTo': ndata.linkedTo,
					'x': ndata.x,
					'y': ndata.y
				});				
			}
			else{
				nodes.get(p).group.push(node);
				nodes.get(p).linkedTo.push(...ndata.linkedTo);
			}
		});

		// add grouped nodes to the network's list of nodes
		nodes.forEach((v,k) => {
			this.nodes.set(k, {
				id: k, 
				symbol: v.group.length
			});
				
			newVm.set(k, {
				isGroup: true, 
				group: v.group,
				linkedTo: v.linkedTo,
				x: v.x,
				y: v.y
			});
		});
		
		this.vm.set(layerName, newVm);
	}

	/**
	 * 
	 * @param {*} layer 
	 * @param {*} display 
	 */
	setDisplayLayer(layer, display){
		this.displayedLayers.get(layer).display = display;
	}

	setNodePosition(id,layer,x,y){
		this.vm.get(layer).get(id).x = x;
		this.vm.get(layer).get(id).y = y;
	}

	/**
	 * Update the position of the nodes
	 * We will implement a simple grid layout of the nodes, stacking from top to 
	 * bottom the different layers of the network
	 * @param {int} width the width of the drawing panel in pixels
	 * @param {int} height the height of the drawin panel in pixels
	 * @returns the radius (r) of the circle used to represent a node
	 */
	setNodesPositions(width, height){
		// calculate the number of nodes that need to be displayed
		// let n = this.displayLayers.map(dl => this.vm.get(dl[0]).size);
		// console.log('n',n);
		// // let n = this.vm.keys().reduce([...this.displayLayers.keys()].map(dl => {
		// // 	return this.vm.get(dl).size;
		// // });
		
		// // how many columns there will be on each layer?? - initally only one
		// let layerCols = Array(this.displayLayers.length).fill(1);
		// // the total number of columns is the sum of all the layer columns
		// let totalCols = layerCols.reduce((a,b) => a+b, 0);
		// // minimum number of rows is proportional to the aspect ratio
		// let totalRows = Math.ceil(totalCols*height/width); 
		
		// // do the number of nodes of layer i fit in the allocated rows*cols?
		// let fits = layerCols.map((r,i) => r*totalRows >= n[i]); 
		// console.log(fits);
		// // if not... increase the number of rows or cols
		// while (fits.includes(false)){
		// 	layerCols = layerCols.map((r,i) => r*totalRows < n[i]? r+1 : r);
		// 	totalCols = layerCols.reduce((a,b) => a+b, 0);
		// 	totalRows = Math.ceil(totalCols*height/width);
		// 	fits = layerCols.map((r,i) => r*totalRows >= n[i]);
		// }
		// layerCols = layerCols.map((r,i)=> Math.ceil(n[i]/totalRows));
		// console.log(totalRows);
		// console.log(layerCols);
		
		// calculate the number of nodes that need to be displayed
		// let n = [...this.displayLayers.keys()].map(dl => {
		// 	return this.vm.get(dl).size;
		// });
		let n = [...this.displayedLayers.keys()].map(dl => this.vm.get(dl).size);
		
		// based on the number of nodes to be displayed on each layer, decide the 
		// number of rows and columns the graph should have
		let layerRows = Array(this.displayedLayers.size).fill(1);
		// minimum number of rows is one per display layer
		let totalRows = layerRows.reduce((a,b) => a+b, 0); 
		// minimum number of cols is proportional to the aspect ratio
		let totalCols = Math.ceil(totalRows*width/height); 
		// do the number of nodes of layer i fit in the allocated rows*cols?
		let fits = layerRows.map((r,i) => r*totalCols >= n[i]); 
		// if not... increase the number of rows or cols
		while (fits.includes(false)){
			layerRows = layerRows.map((r,i) => r*totalCols < n[i]? r+1 : r);
			totalRows = layerRows.reduce((a,b) => a+b, 0);
			totalCols = Math.ceil(totalRows*width/height);
			fits = layerRows.map((r,i) => r*totalCols >= n[i]);
		}
		layerRows = layerRows.map((r,i)=> Math.ceil(n[i]/totalCols));
		
		// the row index for the current node (the actual shifting in position
		// will be handled based on this index)
		let dx = width/totalCols;
		let dy = height/totalRows; 
		let bb = Math.min(dx,dy); // the bounding box for a node
		let r = bb*.3; // radio of the circle used to represent a node

		// actually position the nodes on each layer
		// let y = 0; // initial row
		let i = 0;
		[...this.displayedLayers.keys()].forEach(dl => {
			// we set the starting row and column for node positioning
			let x = Math.floor(totalCols/2); // initial column (at the center)
			let j = 1;
			let y = 0;

			// // and position the nodes one by one, moving away from the center column
			// // and down as the columns get filled
			this.vm.get(dl).forEach((node) => {
				node['x'] = (dx*(x%totalCols)) + (dx/2);
				node['y'] = (dy*y) + (dy/2);
				
				x += ((-1)**j)*j;
				
				j += 1;
				if(x >= totalCols || x < 0){
					x = Math.floor(totalCols/2);
					y += 1;
					j = 1;
				}
			});
			// add 'layer bounding box' based on the nodes coordinates
			this.layers.get(dl)['dims'] = { width, height: dy*layerRows[i] };
			i+=1;
		});
		// return the updated width/height svg viewBox
		return r; //[r, width, totalRows*dy];
	}
}

function TSH(s){
	for(var i=0,h=9;i<s.length;){
		h=Math.imul(h^s.charCodeAt(i++),9**9);
	}
	return Math.abs(h^h>>>9);
}