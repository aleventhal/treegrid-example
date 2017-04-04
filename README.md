# ARIA treegrid example

[Jump to interactive version](http://htmlpreview.github.io/?https://github.com/aleventhal/treegrid-example/blob/master/treegrid.html)

# Rationale

The ARIA treegrid has not gotten enough love. Docs the old specs provide recommendations for keyboard shortcuts that would conflict with browser/OS keys.

# Challenges

The main challenge is that the left/right arrow key could be used to collapse/expand or to move by column. The few approaches out there take the approach that left/right should move by cell, but this takes the opposite approach. In this example, left/right collapse/expand, and move-by-word keys are used to move by cell.

# Assumptions

* Most treegrids don't have that many columns, and are more vertical than horizontal
* Most users know how to navigate a tree
* The most important navigation in a treegrid is by row, like in a normal tree
* Navigation by cell is often more of a convenience than a necessity

# Approach
* By default, a user is in row navigation mode. We allow traversal of columns via the move-by-word keys.
* Ideally, screen readers would automatically read from the currently focused cell to the end of the row. The benefit of this would be that the user could effectively always be in row mode, as the screen reader would end up reading the entire line when moving to the next row anyway. However, screen readers don't necessarily do this currently. Thus, the approach was taken that when the first column would have been active, we focus the entire row, to help the screen reader know to read the entire thing.

# Keyboard specifics
* Up/down - moves by row is in an ordinary tree
* Left/right - collapses/expands or moves to parent/first-child as in an ordinary tree
* Move by word key (ctrl+left/right or alt/left+right depending on the platform) - move by column
* Home/end - move to first/last row or column, depending on whether the last thing focused was a row or column

# Markup used
* roles used are treegrid, row and gridcell
* aria-level: used to set the current level of an item, 1, 2, 3, etc.
* aria-posinset, aria-setsize: used to indicate the position of an item within it's local group, such as item 3 of 5
* aria-expanded (triststate): this attribute must be removed (not present) if the item cannot be expanded. For expandable items, the value is "true" or "false"
* aria-hidden: set to "true" for child items that are currently hidden because the parent is collapsed
* aria-owns: not currently used, awaiting discussion. Could be used for parents to identify their children.
* aria-labelledby or aria-describedby for headers? Not currently used, awaiting discussion
* aria-activedescendant -- this example does not use, because it is not exposed to ATs in IE, and thus uses tabindex instead
* tabindex is set in the JS, as per the usual roving tabindex methodology. Specifically, we use tabindex="0" for the current item so that it is the subitem that gets focused if user tabs out and back in, and tabindex="-1" for all items where we want click-to-focus behavior enabled.

# Observations with screen readers
## Chrome
* NVDA
* JAWS
* VoiceOver
* ChromeVox

## Firefox
* NVDA
* JAWS

## IE11
* NVDA:
* JAWS:

## Safari
* Chromevox:

