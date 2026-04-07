import { createSlice } from '@reduxjs/toolkit'

export const interactionSlice = createSlice({
  name: 'interaction',
  initialState: {
    selectedItems: [], // array of item index selected by the brush
    hoveredItem: null, // index of the currently hovered item
  },
  reducers: {
    setSelectedItems: (state, action) => {
      state.selectedItems = action.payload;
    },
    setHoveredItem: (state, action) => {
      state.hoveredItem = action.payload;
    }
  }
})

export const { setSelectedItems, setHoveredItem } = interactionSlice.actions
export default interactionSlice.reducer
