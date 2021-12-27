-- BASIC
vim.o.shell = '/bin/zsh'
vim.o.encoding = 'utf-8'
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
vim.o.laststatus = 2
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
vim.o.undodir = '~/.vimdid'
vim.o.undofile = true

-- VIMDIFF
vim.opt.diffopt:append({ iwhite = true }) -- no whitespace
vim.opt.diffopt:append({ algorithm = 'patience' }) -- https://vimways.org/2018/the-power-of-diff/
