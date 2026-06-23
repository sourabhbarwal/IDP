import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { catalogService, CreateServicePayload, ListServicesParams, UpdateServicePayload } from '../../services/catalog.service';
import { CatalogService } from '../../types/catalog.types';

interface CatalogState {
  services: CatalogService[];
  selectedService: CatalogService | null;
  totalElements: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
}

const initialState: CatalogState = {
  services: [], selectedService: null,
  totalElements: 0, totalPages: 0,
  loading: false, error: null,
};

export const fetchServices = createAsyncThunk(
  'catalog/fetchServices',
  async (params: ListServicesParams, { rejectWithValue }) => {
    try {
      const { data } = await catalogService.list(params);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail ?? 'Failed to fetch services');
    }
  },
);

export const fetchServiceById = createAsyncThunk(
  'catalog/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await catalogService.getById(id);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail ?? 'Service not found');
    }
  },
);

export const createService = createAsyncThunk(
  'catalog/create',
  async (payload: CreateServicePayload, { rejectWithValue }) => {
    try {
      const { data } = await catalogService.create(payload);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail ?? 'Failed to create service');
    }
  },
);

export const updateService = createAsyncThunk(
  'catalog/update',
  async ({ id, payload }: { id: string; payload: UpdateServicePayload }, { rejectWithValue }) => {
    try {
      const { data } = await catalogService.update(id, payload);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail ?? 'Failed to update service');
    }
  },
);

export const deleteService = createAsyncThunk(
  'catalog/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await catalogService.remove(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail ?? 'Failed to delete service');
    }
  },
);

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    clearSelected(state) { state.selectedService = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServices.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.loading = false;
        state.services = action.payload.content;
        state.totalElements = action.payload.totalElements;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchServices.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchServiceById.pending, (state) => { state.loading = true; })
      .addCase(fetchServiceById.fulfilled, (state, action) => { state.loading = false; state.selectedService = action.payload; })
      .addCase(fetchServiceById.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createService.fulfilled, (state, action) => { state.services.unshift(action.payload); state.totalElements += 1; })
      .addCase(updateService.fulfilled, (state, action) => {
        state.selectedService = action.payload;
        const idx = state.services.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.services[idx] = action.payload;
      })
      .addCase(deleteService.fulfilled, (state, action) => {
        state.services = state.services.filter((s) => s.id !== action.payload);
        state.totalElements = Math.max(0, state.totalElements - 1);
      });
  },
});

export const { clearError, clearSelected } = catalogSlice.actions;
export default catalogSlice.reducer;