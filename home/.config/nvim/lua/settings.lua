-- BASIC
vim.o.shell = '/bin/zsh'
vim.o.encoding = 'utf-8'
vim.o.fileencoding = 'utf-8'
vim.o.ignorecase = true
-- vim.o.nocompatible = true
vim.o.hidden = true
vim.o.ruler = true
vim.o.ttyfast = true
-- https://github.com/vim/vim/issues/1735#issuecomment-383353563
vim.o.lazyredraw = true
-- http://stackoverflow.com/questions/2158516/delay-before-o-opens-a-new-line
vim.o.timeoutlen = 300
vim.opt.shortmess:append({ c = true })
vim.o.splitright = true
vim.o.splitbelow = true
vim.o.showmode = false

-- Disable netrw
vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1

-- EDITOR
vim.o.re = 0
vim.o.autoindent = true
vim.o.ai = true
vim.o.foldlevel = 99 -- open all folds
vim.o.clipboard = 'unnamed' -- use system clipboard
vim.o.smartindent = true
vim.o.expandtab = true
vim.o.tabstop = 4
vim.o.shiftwidth = 4
vim.o.softtabstop = 4
vim.o.number = true
vim.o.rnu = true
vim.o.laststatus = 2 -- always show status line per-window
vim.o.mouse = 'a' -- mouse to click, scroll
-- allow backspace in insert mode
vim.opt.backspace = {'indent', 'eol', 'start'}
vim.o.signcolumn = 'yes'

-- WILDMENU
vim.opt.completeopt = {'menu', 'menuone', 'noselect'}
vim.o.wildmenu = true
vim.o.wildmode = 'list:longest'
vim.opt.wildignore = {'.hg', '.svn', '*~', '*.png', '*.jpg', '*.gif', '*.heic', '*.settings', 'Thumbs.db', '*.min.js', '*.swp', '*.o', '*.hi', 'Zend', 'vendor'}

-- BETTER SEARCH
vim.o.incsearch = true
vim.o.ignorecase = true
vim.o.smartcase = true
vim.o.gdefault = true -- (g search) option by default

-- UNDO
vim.opt.undodir = vim.fn.stdpath('config') .. '/vimdid'
vim.opt.undofile = true

-- VIMDIFF
vim.opt.diffopt:append({ iwhite = true }) -- no whitespace
vim.opt.diffopt:append({ algorithm = 'patience' }) -- https://vimways.org/2018/the-power-of-diff/

-- COMMANDS
local ag = vim.api.nvim_create_augroup
local au = vim.api.nvim_create_autocmd
au('TextYankPost', {
  group = ag('yank_highlight', {}),
  pattern = '*',
  callback = function()
    vim.highlight.on_yank { higroup = 'IncSearch', timeout = 300 }
  end,
})

-- Autoformat toggle commands
vim.api.nvim_create_user_command('FormatDisable', function(args)
  if args.bang then
    -- FormatDisable! will disable formatting globally
    vim.g.disable_autoformat = true
    print('Autoformat disabled globally')
  else
    -- FormatDisable will disable formatting for current buffer
    vim.b.disable_autoformat = true
    print('Autoformat disabled for this buffer')
  end
end, {
  desc = 'Disable autoformat-on-save',
  bang = true,
})

vim.api.nvim_create_user_command('FormatEnable', function()
  vim.b.disable_autoformat = false
  vim.g.disable_autoformat = false
  print('Autoformat enabled')
end, {
  desc = 'Re-enable autoformat-on-save',
})

vim.api.nvim_create_user_command('FormatStatus', function()
  local buf_disabled = vim.b.disable_autoformat
  local global_disabled = vim.g.disable_autoformat
  
  -- Check for .nvim-no-format marker file
  local root_dir = vim.fs.root(0, { '.git', 'package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml' })
  local marker_exists = root_dir and vim.fn.filereadable(root_dir .. '/.nvim-no-format') == 1
  
  local status = "Autoformat Status:\n"
  status = status .. "  Buffer: " .. (buf_disabled and "disabled" or "enabled") .. "\n"
  status = status .. "  Global: " .. (global_disabled and "disabled" or "enabled") .. "\n"
  status = status .. "  Project marker (.nvim-no-format): " .. (marker_exists and "found (disabled)" or "not found") .. "\n"
  status = status .. "\n"
  status = status .. "Overall: " .. ((buf_disabled or global_disabled or marker_exists) and "DISABLED" or "ENABLED")
  
  print(status)
end, {
  desc = 'Show autoformat status',
})

-- Notify when opening a project with .nvim-no-format
au('BufEnter', {
  group = ag('autoformat_notification', {}),
  callback = function()
    if vim.b.autoformat_notified then
      return
    end
    
    local root_dir = vim.fs.root(0, { '.git', 'package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml' })
    if root_dir and vim.fn.filereadable(root_dir .. '/.nvim-no-format') == 1 then
      vim.b.autoformat_notified = true
      vim.notify('Autoformatting disabled (.nvim-no-format found)', vim.log.levels.INFO)
    end
  end,
})

-- DIAGNOSTICS

