import UI from './UI.js';
/*import sigma from 'sigma';
import MaxFlow from './MaxFlow';

sigma.classes.graph.addMethod( 'maxFlow', function(source,target) {
	const maxflow = new MaxFlow(this, source, target);
	return maxflow.DinicMaxFlow();
});
sigma.classes.graph.addMethod( 'hasEdge', function(id) {
	return id in this.edgesIndex;
});

document.addEventListener('DOMContentLoaded', function() {
	const s = new sigma('container');
	for( let i = 0; i < 8; i++) {
		s.graph.addNode({
			id: i,
			size: 1,
			color: '#f00',
			label: '' + i
		});
	}
	const edges = [
		{ id: '0,1', source: 0, target: 1, capacity: 10 },
		{ id: '0,2', source: 0, target: 2, capacity: 5 },
		{ id: '0,3', source: 0, target: 3, capacity: 15 },
		{ id: '1,4', source: 1, target: 4, capacity: 9 },
		{ id: '1,5', source: 1, target: 5, capacity: 15 },
		{ id: '1,2', source: 1, target: 2, capacity: 4 },
		{ id: '2,5', source: 2, target: 5, capacity: 8 },
		{ id: '2,3', source: 2, target: 3, capacity: 4 },
		{ id: '3,6', source: 3, target: 6, capacity: 16 },
		{ id: '4,5', source: 4, target: 5, capacity: 15 },
		{ id: '4,7', source: 4, target: 7, capacity: 10 },
		{ id: '5,7', source: 5, target: 7, capacity: 10 },
		{ id: '5,6', source: 5, target: 6, capacity: 15 },
		{ id: '6,2', source: 6, target: 2, capacity: 6 },
		{ id: '6,7', source: 6, target: 7, capacity: 10 },
	];
	edges.forEach( (edge) => {
		s.graph.addEdge({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			capacity: edge.capacity,
			label : 'edge: ' + edge.capacity
		});
	});
	s.graph.nodes().forEach(function(node, i, a) {
		node.x = Math.cos(Math.PI * 2 * i / a.length);
		node.y = Math.sin(Math.PI * 2 * i / a.length);
		node.size=8;
		node.color='#f00';
	});
	const mf = s.graph.maxFlow( { id : 0 }, { id : 7 });
	console.log( mf.value );
	console.log( mf.minCut() );

	s.refresh();
});*/

new UI();
