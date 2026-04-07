import './Hierarchy.css'
import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux'
import { setHoveredItem } from '../../redux/InteractionSlice';

import HierarchyD3 from './Hierarchy-d3';

function HierarchyContainer({ valueAttribute, colorAttribute, theme = 'light' }) {
    const visData          = useSelector(state => state.dataSet)
    const interactionState = useSelector(state => state.interaction)
    const dispatch         = useDispatch();

    const [layoutMode, setLayoutMode] = useState('treemap');

    const divContainerRef = useRef(null);
    const hierarchyD3Ref  = useRef(null);

    const getChartSize = () => ({
        width:  divContainerRef.current?.offsetWidth,
        height: divContainerRef.current?.offsetHeight,
    });

    // Mount: create SVG structure once
    useEffect(() => {
        const hierarchyD3 = new HierarchyD3(divContainerRef.current);
        hierarchyD3.create({ size: getChartSize() }, theme);
        hierarchyD3Ref.current = hierarchyD3;
        return () => { hierarchyD3Ref.current.clear(); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-render when data, layout, or theme change
    useEffect(() => {
        if (visData?.length > 0 && hierarchyD3Ref.current) {
            const controllerMethods = {
                handleOnMouseEnter: (itemData) => {
                    if (itemData.data && itemData.data.index !== undefined) {
                        dispatch(setHoveredItem(itemData.data.index));
                    }
                },
                handleOnMouseLeave: () => dispatch(setHoveredItem(null)),
            };
            hierarchyD3Ref.current.renderVis(
                visData, valueAttribute, colorAttribute, layoutMode, controllerMethods, theme
            );
        }
    }, [visData, valueAttribute, colorAttribute, layoutMode, theme, dispatch]);

    // Cross-highlight when selection / hover changes
    useEffect(() => {
        if (hierarchyD3Ref.current) {
            hierarchyD3Ref.current.highlightSelectedItems(
                interactionState.selectedItems, interactionState.hoveredItem
            );
        }
    }, [interactionState.selectedItems, interactionState.hoveredItem]);

    // Resize
    useEffect(() => {
        const handleResize = () => {
            if (hierarchyD3Ref.current) {
                const controllerMethods = {
                    handleOnMouseEnter: (item) => {
                        if (item.data && item.data.index !== undefined) {
                            dispatch(setHoveredItem(item.data.index));
                        }
                    },
                    handleOnMouseLeave: () => dispatch(setHoveredItem(null)),
                };
                hierarchyD3Ref.current.resize(getChartSize());
                hierarchyD3Ref.current.renderVis(
                    visData, valueAttribute, colorAttribute, layoutMode, controllerMethods, theme
                );
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [visData, valueAttribute, colorAttribute, layoutMode, theme, dispatch]);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Layout toggle — uses CSS classes from index.css, no Bootstrap needed */}
            <div style={{ flexShrink: 0, marginBottom: 5 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', marginRight: 6 }}>Layout:</span>
                <button
                    className={`layout-btn${layoutMode === 'pack' ? ' active' : ''}`}
                    onClick={() => setLayoutMode('pack')}
                >Circle Packing</button>
                <button
                    className={`layout-btn${layoutMode === 'treemap' ? ' active' : ''}`}
                    onClick={() => setLayoutMode('treemap')}
                >Treemap</button>
            </div>

            <div ref={divContainerRef} className="hierarchyDivContainer" style={{ flexGrow: 1, minHeight: 0 }} />
        </div>
    );
}

export default HierarchyContainer;
