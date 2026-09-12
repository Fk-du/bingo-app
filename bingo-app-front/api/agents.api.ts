import apiClient from './client';
import {
  ApiResponse,
  AgentResponse,
  AgentFundRequestResponse,
  AgentStatusRequest,
  AgentFundRequestCreate,
  AdminWarningResponse,
  AgentStatsResponse,
  OwnerFeeSettlementResponse,
  OwnerFeeSummaryResponse,
  OwnerFeeSettlementCreate,
  AdminOwnerFeeSummaryResponse,
} from '@/types';

export const agentsApi = {
  list: async () => {
    const res = await apiClient.get<ApiResponse<AgentResponse[]>>('/agents');
    return res.data;
  },
  invite: async () => {
    const res = await apiClient.post<ApiResponse<string>>('/agents/invite');
    return res.data;
  },
  updateStatus: async (id: number, data: AgentStatusRequest) => {
    const res = await apiClient.patch<ApiResponse<AgentResponse>>(`/agents/${id}/status`, data);
    return res.data;
  },
  warn: async (id: number, reason: string) => {
    const res = await apiClient.post<ApiResponse<AdminWarningResponse>>(`/agents/${id}/warn`, { reason });
    return res.data;
  },
  getWarnings: async (id: number) => {
    const res = await apiClient.get<ApiResponse<AdminWarningResponse[]>>(`/agents/${id}/warnings`);
    return res.data;
  },
  getStats: async (id: number) => {
    const res = await apiClient.get<ApiResponse<AgentStatsResponse>>(`/agents/${id}/stats`);
    return res.data;
  },
  createFundRequest: async (data: AgentFundRequestCreate) => {
    const res = await apiClient.post<ApiResponse<AgentFundRequestResponse>>('/agents/fund-requests', data);
    return res.data;
  },
  getFundRequests: async () => {
    const res = await apiClient.get<ApiResponse<AgentFundRequestResponse[]>>('/agents/fund-requests');
    return res.data;
  },
  handleFundRequest: async (id: number, data: { action: string; reason?: string }) => {
    const res = await apiClient.patch<ApiResponse<string>>(`/agents/fund-requests/${id}`, data);
    return res.data;
  },
  getFeeSummary: async () => {
    const res = await apiClient.get<ApiResponse<OwnerFeeSummaryResponse>>('/agents/fee-summary');
    return res.data;
  },
  getAllFeeSummary: async () => {
    const res = await apiClient.get<ApiResponse<AdminOwnerFeeSummaryResponse[]>>('/agents/fee-summary/all');
    return res.data;
  },
  createFeeSettlement: async (data: OwnerFeeSettlementCreate) => {
    const res = await apiClient.post<ApiResponse<OwnerFeeSettlementResponse>>('/agents/fee-settlements', data);
    return res.data;
  },
  getFeeSettlements: async () => {
    const res = await apiClient.get<ApiResponse<OwnerFeeSettlementResponse[]>>('/agents/fee-settlements');
    return res.data;
  },
  handleFeeSettlement: async (id: number, data: { action: string; reason?: string }) => {
    const res = await apiClient.patch<ApiResponse<string>>(`/agents/fee-settlements/${id}`, data);
    return res.data;
  },
};
