import './Scatterplot.css'
import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux'
import { setSelectedItems, setHoveredItem } from '../../redux/InteractionSlice';

import ScatterplotD3 from './Scatterplot-d3';

function ScatterplotContainer({ xAttributeName, yAttributeName, theme = 'light' }) {
    const visData          = useSelector(state => state.dataSet)
    const interactionState = useSelector(state => state.interaction)
    const dispatch         = useDispatch();

    const divContainerRef  = useRef(null);
    const scatterplotD3Ref = useRef(null);

    const getChartSize = () => ({
        width:  divContainerRef.current?.offsetWidth,
        height: divContainerRef.current?.offsetHeight,
    });

    // Mount: create SVG structure once
    useEffect(() => {
        const scatterplotD3 = new ScatterplotD3(divContainerRef.current);
        scatterplotD3.create({ size: getChartSize() }, theme);
        scatterplotD3Ref.current = scatterplotD3;
        return () => { scatterplotD3Ref.current.clear(); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-render when data, attributes, or theme change
    useEffect(() => {
        if (visData?.length > 0 && scatterplotD3Ref.current) {
            const controllerMethods = {
                handleBrush:        (indexes) => dispatch(setSelectedItems(indexes)),
                handleOnMouseEnter: (item)    => dispatch(setHoveredItem(item.index)),
                handleOnMouseLeave: ()        => dispatch(setHoveredItem(null)),
            };
            scatterplotD3Ref.current.renderScatterplot(
                visData, xAttributeName, yAttributeName, controllerMethods, theme
            );
        }
    }, [visData, xAttributeName, yAttributeName, theme, dispatch]);

    // Cross-highlight when selection / hover changes
    useEffect(() => {
        if (scatterplotD3Ref.current) {
            scatterplotD3Ref.current.highlightSelectedItems(
                interactionState.selectedItems, interactionState.hoveredItem
            );
        }
    }, [interactionState.selectedItems, interactionState.hoveredItem]);

    // Resize
    useEffect(() => {
        const handleResize = () => {
            if (scatterplotD3Ref.current) {
                const controllerMethods = {
                    handleBrush:        (indexes) => dispatch(setSelectedItems(indexes)),
                    handleOnMouseEnter: (item)    => dispatch(setHoveredItem(item.index)),
                    handleOnMouseLeave: ()        => dispatch(setHoveredItem(null)),
                };
                scatterplotD3Ref.current.resize(getChartSize());
                scatterplotD3Ref.current.renderScatterplot(
                    visData, xAttributeName, yAttributeName, controllerMethods, theme
                );
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [visData, xAttributeName, yAttributeName, theme, dispatch]);

    return (
        <div ref={divContainerRef} className="scatterplotDivContainer" style={{ position: 'absolute', inset: 0 }} />
    );
}

export default ScatterplotContainer;
