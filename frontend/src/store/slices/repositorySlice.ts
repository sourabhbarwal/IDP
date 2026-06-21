import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { repositoryService, ProvisionRepositoryPayload } from '../../services/repository.service';
import { Repository } from '../../types/repository.types';

interface RepositoryState {
  repositoriesByServiceId: Record<string, Repository>;
  loading: boolean;
  error: string | null;
}

const initialState: RepositoryState = {
  repositoriesByServiceId: {}, loading: false, error: null,
};

export const provisionRepository = createAsyncThunk(
  'repository/provision',
  async (payload: ProvisionRepositoryPayload, { rejectWithValue }) => {
    try {
      const { data } = await repositoryService.provision(payload);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail ?? 'Failed to provision repository');
    }
  },
);

export const fetchRepositoryByServiceId = createAsyncThunk(
  'repository/fetchByServiceId',
  async (serviceId: string, { rejectWithValue }) => {
    try {
      const { data } = await repositoryService.getByServiceId(serviceId);
      return data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      return rejectWithValue(err.response?.data?.detail ?? 'Failed to fetch repository');
    }
  },
);

const repositorySlice = createSlice({
  name: 'repository',
  initialState,
  reducers: {
    clearRepositoryError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(provisionRepository.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(provisionRepository.fulfilled, (state, action) => {
        state.loading = false;
        state.repositoriesByServiceId[action.payload.serviceId] = action.payload;
      })
      .addCase(provisionRepository.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchRepositoryByServiceId.pending, (state) => { state.loading = true; })
      .addCase(fetchRepositoryByServiceId.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.repositoriesByServiceId[action.payload.serviceId] = action.payload;
        }
      })
      .addCase(fetchRepositoryByServiceId.rejected, (state) => { state.loading = false; });
  },
});

export const { clearRepositoryError } = repositorySlice.actions;
export default repositorySlice.reducer;