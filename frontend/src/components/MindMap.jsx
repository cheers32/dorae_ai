import React, { useEffect, useState } from 'react';
import ReactFlow, {
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Position,
    Handle
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { BrainCircuit, Sparkles } from 'lucide-react';
import { api } from '../api';

const ThemeNode = ({ data, isConnectable }) => {
    const { label, description, isRoot } = data;

    if (isRoot) {
        return (
            <div className="relative group flex flex-col items-center">
                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                <div className="relative w-32 h-32 flex flex-col items-center justify-center bg-gray-900 border border-blue-500/50 rounded-full shadow-[0_0_50px_rgba(59,130,246,0.3)] transition-transform hover:scale-105">
                    <BrainCircuit size={32} className="text-blue-400 mb-2" />
                    <span className="text-white font-bold text-sm tracking-widest uppercase">My Mindset</span>
                </div>
                <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="!bg-transparent !border-none" />
            </div>
        );
    }

    return (
        <div className="relative group w-[220px]">
            <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative p-6 bg-gray-900/40 border border-white/10 rounded-2xl hover:bg-gray-800/60 hover:border-indigo-400/30 transition-all duration-300">
                <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="!bg-transparent !border-none" />

                <div className="flex items-center gap-3 mb-2">
                    <Sparkles size={16} className="text-indigo-400" />
                    <h3 className="text-lg font-bold text-white leading-tight">{label}</h3>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed font-light">
                    {description}
                </p>

                {data.keywords && (
                    <div className="flex flex-wrap gap-1 mt-3">
                        {data.keywords.map((k, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white/5 rounded-full text-[10px] text-gray-500">{k.name}</span>
                        ))}
                    </div>
                )}

                <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="!bg-transparent !border-none" />
            </div>
        </div>
    );
};

const nodeTypes = {
    theme: ThemeNode,
};

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({
        rankdir: direction,
        nodesep: 50,
        ranksep: 100
    });

    nodes.forEach((node) => {
        // Approximate sizes
        const w = node.data.isRoot ? 150 : 250;
        const h = node.data.isRoot ? 150 : 200;
        dagreGraph.setNode(node.id, { width: w, height: h });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = Position.Left;
        node.sourcePosition = Position.Right;
        node.position = {
            x: nodeWithPosition.x - (node.data.isRoot ? 75 : 125),
            y: nodeWithPosition.y - (node.data.isRoot ? 75 : 100),
        };
        return node;
    });

    return { nodes, edges };
};

export const MindMap = ({ tasks }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMindset = async () => {
            setLoading(true);
            try {
                // Call the AI endpoint
                const data = await api.getMindset();

                if (!data || !data.children) {
                    setLoading(false);
                    return;
                }

                const newNodes = [];
                const newEdges = [];
                const rootId = 'root';

                // Root
                newNodes.push({
                    id: rootId,
                    type: 'theme',
                    data: { label: 'My Mindset', isRoot: true },
                    position: { x: 0, y: 0 },
                });

                // Themes (Level 1)
                data.children.forEach((theme, index) => {
                    const themeId = `theme-${index}`;
                    newNodes.push({
                        id: themeId,
                        type: 'theme',
                        data: {
                            label: theme.name,
                            description: theme.description,
                            keywords: theme.children
                        },
                        position: { x: 0, y: 0 },
                    });

                    newEdges.push({
                        id: `e-${rootId}-${themeId}`,
                        source: rootId,
                        target: themeId,
                        animated: true,
                        style: { stroke: 'rgba(99, 102, 241, 0.3)', strokeWidth: 2 },
                    });
                });

                const layouted = getLayoutedElements(newNodes, newEdges);
                setNodes(layouted.nodes);
                setEdges(layouted.edges);
            } catch (err) {
                console.error("Failed to load mindset", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMindset();
    }, []);

    if (loading) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#020617] text-indigo-400 space-y-4">
                <BrainCircuit className="animate-pulse" size={48} />
                <p className="text-sm tracking-[0.2em] uppercase opacity-70 animate-pulse">Consulting AI...</p>
                <p className="text-xs text-indigo-400/50">Synthesizing your global tasks into abstract themes</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-[#020617]">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.2}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
            >
                <Background color="#6366f1" gap={80} size={1} style={{ opacity: 0.05 }} />
                <Controls className="!bg-white/5 !border-none !fill-white/50" />
            </ReactFlow>
        </div>
    );
};
