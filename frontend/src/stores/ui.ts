import { create } from 'zustand'

interface UiState {
  newProposalOpen: boolean
  openNewProposal: () => void
  closeNewProposal: () => void
}

export const useUiStore = create<UiState>((set) => ({
  newProposalOpen: false,
  openNewProposal: () => set({ newProposalOpen: true }),
  closeNewProposal: () => set({ newProposalOpen: false }),
}))
