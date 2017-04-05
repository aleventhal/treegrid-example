function onReady(treegrid, moveByWordModifier) {
  function isChecked(id) {
    return document.getElementById(id).checked;
  }

  function shouldKeepColAfterRowNav() {
    return isChecked('keepColAfterRowNav');
  }

  function shouldResetToRowModeAfterBlur() {
    return isChecked('resetToRowModeAfterBlur');
  }

  function shouldFocusFirstColumn() {
    return isChecked('focusFirstColumn');
  }

  function shouldAddLabelledByOnCellFocus() {
    return isChecked('addCellLabelledBy');
  }

  function onRolePref() {
    function setRole(elementList, role) {
      var index = elementList.length;
      while (index --) {
        elementList[index].setAttribute('role', role);
      }
    }
    var useTreeItem = document.getElementById('useTreeItem').checked;
    var treeItems = treegrid.getElementsByTagName('tr');
    setRole(treeItems, useTreeItem ? 'treeitem' : 'row');
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

  function addLabelledBy(elem) {
    if (elem.hasAttribute('aria-labelledby')) {
      return;
    }
    if (!elem.id) {
      addLabelledBy.counter = (addLabelledBy.counter || 0) + 1;
      elem.id = addLabelledBy.counter;
    }
    elem.setAttribute('aria-labelledby', elem.id);
  }

  function focus(elem) {
    elem.tabIndex = 0; // Ensure focusable
    if (elem.localName === 'td') {
      if (shouldAddLabelledByOnCellFocus()) {
        addLabelledBy(elem);
      }
    }
    elem.focus();
  }

  // Restore tabIndex to what it should be when focus switches from
  // one treegrid item to another
  function onFocusIn(event) {
    var prevTreeGridFocus = onFocusIn.prevTreeGridFocus;
    var newTreeGridFocus =
      event.target !== window && treegrid.contains(event.target) && event.target;

    if (!newTreeGridFocus) {
      // Moved out of treegrid
      if (prevTreeGridFocus && prevTreeGridFocus.localName === 'td' &&
        shouldResetToRowModeAfterBlur()) {
        // When focus leaves treegrid, reset focus mode back to rows
        prevTreeGridFocus.removeAttribute('tabindex');
        setTimeout(function() {
          // Wait for a moment so that we don't end up back on row when
          // trying to shift+tab out of grid
          prevTreeGridFocus.parentElement.tabIndex = 0;
        }, 0);
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
    // Waiting fixes bug with tabbing when screen readers active in IE
    setTimeout(function() {
      newTreeGridFocus.tabIndex = 0;
    }, 0);

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
    var firstFocusableColIndex = shouldFocusFirstColumn() ? 0 : 1;

    if (currentColIndex < firstFocusableColIndex) {
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
    var currentCol = getCurrentColumn(currentRow);
    var currentColIndex = cols.indexOf(currentCol);
    var newColIndex;
    var firstFocusableColIndex = shouldFocusFirstColumn() ? 0 : 1;
    // First alt/ctrl+right moves to first column
    newColIndex = (currentCol || direction < 0) ? currentColIndex + direction :
      firstFocusableColIndex;
    // Moving past beginning focuses row
    if (newColIndex < firstFocusableColIndex) {
      focus(currentRow);
      return;
    }
    newColIndex = restrictIndex(newColIndex, numCols);
    focus(cols[newColIndex]);
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
      if (shouldFocusFirstColumn()) {
        focus(cols[0]);
      }
      else {
        focus(currentRow);
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
    var currentLevel = getLevel(currentRow);
    var rows = getAllRows();
    var currentRowIndex = rows.indexOf(currentRow);
    console.assert(currentRowIndex >= 0);
    var didChange;
    var doExpandLevel = [];
    doExpandLevel[currentLevel + 1] = doExpand;

    while (++ currentRowIndex < rows.length) {
      var nextRow = rows[currentRowIndex];
      var rowLevel = getLevel(nextRow);
      if (rowLevel <= currentLevel) {
        break; // Next row is not a level down from current row
      }
      // Only expand the next level if this level is expanded
      // and previous level is expanded
      doExpandLevel[rowLevel + 1] =
        doExpandLevel[rowLevel] &&
        nextRow.getAttribute('aria-expanded') === 'true';
      var willHideRow = !doExpandLevel[rowLevel];
      var isRowHidden = nextRow.getAttribute('aria-hidden') === 'true';

      if (willHideRow !== isRowHidden) {
        nextRow.setAttribute('aria-hidden', willHideRow);
        didChange = true;
      }
    }
    if (didChange) {
      currentRow.setAttribute('aria-expanded', doExpand);
      return true;
    }
  }

  function onKeyDown(event) {
    function isMoveByWordModifierPressed() {
      // Be very strict about move-by-word keystroke detection as we don't
      // want to prevent other commands in OS or screen reader
      if (!event[moveByWordModifier]) {
        return;
      }
      var numModifiersPressed = Boolean(event.ctrlKey) + Boolean(event.altKey);
      return numModifiersPressed === 1; // No more than one modifer pressed
    }

    function isAltOrCtrlPressed() {
      return event.ctrlKey || event.altKey;
    }

    function isUnusedModifierCombo() {
      if (event.metaKey || event.shiftKey) {
        return true; // We ignore these no matter what
      }
      if (event.keyCode === LEFT || event.keyCode === RIGHT) {
        if (isAltOrCtrlPressed() && !isMoveByWordModifierPressed()) {
          return true;
        }
      }
      else if (isAltOrCtrlPressed()) {
        return true;
      }
    }

    var UP = 38;
    var DOWN = 40;
    var LEFT = 37;
    var RIGHT = 39;
    var HOME = 36;
    var END = 35;

    if (isUnusedModifierCombo(event)) {
      return;
    }

    switch (event.keyCode) {
    case DOWN:
      moveByRow(1); break;
    case UP:
      moveByRow(-1); break;
    case LEFT:
      if (isMoveByWordModifierPressed()) {
        moveByCol(-1);
      }
      else {
        changeExpanded(false) || moveByRow(-1, true);
      }
      break;
    case RIGHT:
      if (isMoveByWordModifierPressed()) {
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
  document.getElementById('useTreeItem').addEventListener('change', onRolePref);
}

document.addEventListener('DOMContentLoaded', function() {
  var isMac = navigator.platform.substr(0,3) === 'Mac';
  onReady(document.getElementById('treegrid'), isMac ? 'altKey' : 'ctrlKey');
});

