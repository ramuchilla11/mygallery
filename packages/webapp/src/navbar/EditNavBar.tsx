import * as React from "react";
import { useState, useMemo } from 'react';
import { useEditModeStore, ViewMode } from "../store/edit-mode-store";

import { SearchNavBar } from './search/SearchNavBar';
import { MultiTagDialog } from '../dialog/tag-dialog';
import { addTags } from '../api/ApiService';

export const EditNavBar = () => {
  const [dialogVisible, setDialogVisible] = useState(false);
  const viewMode = useEditModeStore(state => state.viewMode)

  const showSelected = useEditModeStore(state => state.showSelected);
  const toggleShowSelected = useEditModeStore(state => state.toggleShowSelected);
  const selectedIds = useEditModeStore(state => state.selectedIds);
  const count = useEditModeStore(state => state.count);

  const setViewMode = useEditModeStore(state => state.setViewMode)
  const reset = useEditModeStore(state => state.reset);
  const selectAll = useEditModeStore(state => state.selectAll);
  const invert = useEditModeStore(state => state.invert);

  const toggleViewMode = () => {
    setViewMode(viewMode === ViewMode.VIEW ? ViewMode.EDIT : ViewMode.VIEW)
  }

  const onSubmit = ({tags}) => {
    const entryIds = Object.entries(selectedIds).filter(([_, selected]) => selected).map(([id]) => id)
    addTags(entryIds, tags).then(() => {
      setDialogVisible(false);
    })

    return false;
  }

  const selecedCount = useMemo(count, [selectedIds])
  return (
    <>
      <SearchNavBar>
        <div className="nav_group">
          <a className="nav_item link" onClick={toggleViewMode}><i className="fas fa-arrow-left"></i> <span className="hide-sm">Back</span></a>
          <a className="nav_item link" onClick={reset}><i className="fas fa-undo"></i> <span className="hide-sm">Reset all</span></a>
          <a className="nav_item link" onClick={selectAll}><i className="fas fa-folder"></i> <span className="hide-sm">All</span></a>
          <a className="nav_item link" onClick={invert}><i className="fas fa-exchange-alt"></i> <span className="hide-sm">Invert</span></a>
          <a className={`nav_item link ${showSelected ? '-active' : ''}`} onClick={toggleShowSelected}><i className="fas fa-eye"></i> <span className="hide-sm">View selected</span></a>
          <a className="nav_item link" onClick={() => setDialogVisible(true)}><i className="fas fa-check"></i> <span className="hide-sm">{`Edit ${selecedCount} media`}</span><span className="hide-md">{selecedCount}</span></a>
        </div>
      </SearchNavBar>
      { dialogVisible &&
        <MultiTagDialog visible={dialogVisible} onCancel={() => setDialogVisible(false)} onSubmit={onSubmit} />
      }
    </>
  )
}
