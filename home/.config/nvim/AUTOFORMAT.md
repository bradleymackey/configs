# Autoformat Control

This config supports multiple ways to disable autoformatting on save.

## Methods

### 1. Per-Buffer Toggle (Recommended for temporary changes)
```vim
:FormatToggle          " Toggle for current buffer only
:FormatDisable         " Disable for current buffer
:FormatEnable          " Re-enable for current buffer
```

Or use the keybinding:
```
<leader>f              " Toggle autoformat for current buffer
```

### 2. Global Toggle (Affects all buffers)
```vim
:FormatToggle!         " Toggle globally
:FormatDisable!        " Disable globally
```

### 3. Per-Project Marker File (Recommended for projects)
Create a `.nvim-no-format` file in your project root:
```bash
touch .nvim-no-format
```

This will automatically disable autoformatting for all files in that project.

### 4. Per-Project Git Ignore
Add `.nvim-no-format` to your `.gitignore` if you don't want to commit it:
```bash
echo ".nvim-no-format" >> .gitignore
```

Or commit it if your whole team wants to disable nvim autoformatting.

## Examples

### Disable formatting for a specific project:
```bash
cd ~/my-project
touch .nvim-no-format
```

### Disable formatting temporarily while editing:
Press `<space>f` to toggle, or run `:FormatToggle`

### Disable formatting globally for your session:
`:FormatDisable!`

## Status Check

To check if autoformatting is currently enabled, you can:
```vim
:lua print('Buffer:', vim.b.disable_autoformat, 'Global:', vim.g.disable_autoformat)
```
