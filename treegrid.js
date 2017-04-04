function onReady(treegrid) {
  function shouldKeepColAfterRowNav() {
    return document.getElementById('keepColAfterRowNav').checked;
  }

  function shouldAutoFocusRowOnCol0() {
    return document.getElementById('autoFocusRowOnCol0').checked;
  }

  function shouldResetToRowModeAfterBlur() {
    return document.getElementById('resetToRowModeAfterBlur').checked;
  }

  function addTabIndex() {
    // Add tabindex="0" to first row, "-1" to other rows
    // We will use the roving tabindex method since aria-activedescendant
    // does not work in IE
    var rows = getAllRows();
    var index = rows.length;
    while (index -- ) {
      rows[index].tabIndex = index ? -1 : 0;
    }
  }

  function getAllRows() {
    var nodeList = treegrid.querySelectorAll('tbody > tr');
    return Array.prototype.slice.call(nodeList);
  }

  function getAllNavigableRows() {
    var nodeList = treegrid.querySelectorAll('tbody > tr[tabindex]:not([aria-hidden="true"])');
    // Convert to array so that we can use array methods on it
    return Array.prototype.slice.call(nodeList);
  }

  function getNavigableCols(currentRow) {
    var nodeList = currentRow.getElementsByTagName('td');
    return Array.prototype.slice.call(nodeList);
  }

  function restrictIndex(index, numItems) {
    if (index < 0) {
      return 0;
    }
    return index >= numItems ? index - 1: index;
  }

  function focus(elem) {
    elem.tabIndex = 0; // Ensure focusable
    elem.focus();
  }

  // Restore tabIndex to what it should be when focus switches from
  // one treegrid item to another
  function onFocusIn(event) {
    var prevTreeGridFocus = onFocusIn.prevTreeGridFocus;
    var newTreeGridFocus =
      treegrid.contains(event.target) && event.target;

    if (!newTreeGridFocus) {
      // Moved out of treegrid
      if (prevTreeGridFocus && prevTreeGridFocus.localName === 'td' &&
        shouldResetToRowModeAfterBlur()) {
        // When focus leaves treegrid, reset focus mode back to rows
        prevTreeGridFocus.removeAttribute('tabindex');
        prevTreeGridFocus.parentElement.tabIndex = 0;
      }
      onFocusIn.prevTreeGridFocus = null;
      return;
    }

    if (prevTreeGridFocus) {
      // Stayed in treegrid
      if (prevTreeGridFocus.localName === 'td') {
        // Cells are focusable via click, navigation is only via keystroke
        prevTreeGridFocus.removeAttribute('tabindex');
      }
      else if (prevTreeGridFocus.localName === 'tr') {
        // Rows are focusable via click
        prevTreeGridFocus.tabIndex = -1;
      }
    }

    // This is the new element to tab into within the container
    newTreeGridFocus.tabIndex = 0;

    // In tree grid
    onFocusIn.prevTreeGridFocus = newTreeGridFocus;
  }

  function getCurrentRow() {
    var possibleRow = document.activeElement;
    if (treegrid.contains(possibleRow)) {
      while (possibleRow !== treegrid) {
        if (possibleRow.localName === 'tr') {
          return possibleRow;
        }
        possibleRow = possibleRow.parentElement;
      }
    }
  }

  function getCurrentColumn(currentRow) {
    if (currentRow) {
      var possibleCol = document.activeElement;
      if (currentRow.contains(possibleCol)) {
        while (possibleCol !== currentRow) {
          if (possibleCol.localName === 'td') {
            return possibleCol;
          }
          possibleCol = possibleCol.parentElement;
        }
      }
    }
  }

  function getLevel(row) {
    return row && parseInt(row.getAttribute('aria-level'));
  }

  // Move backwards (direction = -1) or forwards (direction = 1)
  // If we also need to move down/up a level, requireLevelChange = true
  // When
  function moveByRow(direction, requireLevelChange) {
    var currentRow = getCurrentRow();
    var requiredLevel = requireLevelChange && currentRow &&
      getLevel(currentRow) + direction;
    var rows = getAllNavigableRows();
    var numRows = rows.length;
    var rowIndex = currentRow ? rows.indexOf(currentRow) : -1;
    // When moving down a level, only allow moving to next row as the
    // first child will never be farther than that
    var maxDistance = requireLevelChange && direction === 1 ? 1 : NaN;

    // Move in direction until required level is found
    do {
      if (maxDistance -- === 0) {
        return; // Failed to find required level, return without focus change
      }
      rowIndex = restrictIndex(rowIndex + direction, numRows);
    }
    while (requiredLevel && requiredLevel !== getLevel(rows[rowIndex]));

    if (!shouldKeepColAfterRowNav() ||
      !switchRowAndColFocus(currentRow, rows[rowIndex])) {
      focus(rows[rowIndex]);
    }
  }

  function switchRowAndColFocus(fromRow, toRow) {

    var currentCol = getCurrentColumn(fromRow);
    if (!currentCol) {
      return;
    }

    var fromCols = getNavigableCols(fromRow);
    var currentColIndex = fromCols.indexOf(currentCol);
    if (currentColIndex <= 0) {
      return;
    }

    var toCols = getNavigableCols(toRow);
    focus(toCols[currentColIndex]);
    return true;
  }

  function moveByCol(direction) {
    var currentRow = getCurrentRow();
    if (!currentRow) {
      return;
    }
    var cols = getNavigableCols(currentRow);
    var numCols = cols.length;
    var currentCol = getCurrentColumn(currentRow) || cols[0];
    var currentColIndex = cols.indexOf(currentCol);
    var newColIndex = restrictIndex(currentColIndex + direction, numCols);
    if (shouldAutoFocusRowOnCol0() && newColIndex === 0) {
      focus(currentRow);  // When reaching col 0, set back to row focus
    }
    else {
      focus(cols[newColIndex]);
    }
  }

  function moveToExtreme(direction) {
    var currentRow = getCurrentRow();
    if (!currentRow) {
      return;
    }
    var currentCol = getCurrentColumn(currentRow);
    if (currentCol) {
      moveToExtremeCol(direction, currentRow);
    }
    else {
      // Move to first/last row
      moveToExtremeRow(direction);
    }
  }

  function moveToExtremeCol(direction, currentRow) {
    // Move to first/last col
    var cols = getNavigableCols(currentRow);
    if (direction === -1) {
      if (shouldAutoFocusRowOnCol0()) {
        focus(currentRow);
      }
      else {
        focus(cols[0]);
      }
    }
    else {
      focus(cols[cols.length - 1]);
    }
  }

  function moveToExtremeRow(direction) {
    var rows = getAllNavigableRows();
    var newRow = rows[direction > 0 ? rows.length - 1 : 0];
    focus(newRow);
  }

  function changeExpanded(doExpand) {
    var currentRow = getCurrentRow();
    if (!currentRow) {
      return;
    }
    var nextLevel = getLevel(currentRow) + 1;
    var rows = getAllRows();
    var currentRowIndex = rows.indexOf(currentRow);
    console.assert(currentRowIndex >= 0);
    var didChange;

    while (++ currentRowIndex < rows.length) {
      var nextRow = rows[currentRowIndex];
      var isVisible = nextRow.getAttribute('aria-hidden') !== 'true';
      if (isVisible === doExpand) {
        break; // Next row already in expected state
      }
      if (getLevel(nextRow) !== nextLevel) {
        break; // Next row is not a level down from current row
      }
      nextRow.setAttribute('aria-hidden', !doExpand);
      didChange = true;
    }
    if (didChange) {
      currentRow.setAttribute('aria-expanded', doExpand);
      return true;
    }
  }

  function onKeyDown(event) {
    var UP = 38;
    var DOWN = 40;
    var LEFT = 37;
    var RIGHT = 39;
    var HOME = 36;
    var END = 35;
    switch (event.keyCode) {
    case DOWN:
      moveByRow(1); break;
    case UP:
      moveByRow(-1); break;
    case LEFT:
      if (event.altKey || event.ctrlKey) {
        moveByCol(-1);
      }
      else {
        changeExpanded(false) || moveByRow(-1, true);
      }
      break;
    case RIGHT:
      if (event.altKey || event.ctrlKey) {
        moveByCol(1);
      }
      else {
        changeExpanded(true) || moveByRow(1, true);
      }
      break;
    case HOME:
      moveToExtreme(-1); break;
    case END:
      moveToExtreme(1); break;
    default:
      return;
    }

    // Important: don't use key for anything else, such as scrolling
    event.preventDefault();
  }

  addTabIndex();
  treegrid.addEventListener('keydown', onKeyDown);
  window.addEventListener('focusin', onFocusIn);
}

document.addEventListener('DOMContentLoaded', function() {
  onReady(document.getElementById('treegrid'));
});
