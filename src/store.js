import { configureStore } from '@reduxjs/toolkit'
import dataSetReducer from './redux/DataSetSlice'
import interactionReducer from './redux/InteractionSlice'

export default configureStore({
  reducer: {
    dataSet: dataSetReducer,
    interaction: interactionReducer,
  }
})