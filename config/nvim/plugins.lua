vim.cmd [[packadd packer.nvim]]

return require('packer').startup(function()
  -- Packer can manage itself
  use 'wbthomason/packer.nvim'

  -- EXPERIMENTAL
  use 'github/copilot.vim'

  -- LSP
  use 'neovim/nvim-lspconfig'
  use 'nvim-lua/plenary.nvim'
  use {
    'jose-elias-alvarez/null-ls.nvim',
    requires = { 'nvim-lua/plenary.nvim' }
  }
  use 'nvim-lua/lsp-status.nvim'

  -- COMPLETION
  use 'ray-x/lsp_signature.nvim'
  use {
    'hrsh7th/nvim-cmp',
    requires = {
      'hrsh7th/cmp-nvim-lsp',
      'hrsh7th/cmp-buffer',
      'hrsh7th/cmp-path',
      'hrsh7th/cmp-cmdline',
      'hrsh7th/cmp-vsnip',
      'hrsh7th/vim-vsnip',
      'onsails/lspkind-nvim'
    }
  }

  -- GUI
  use {
    'luochen1990/rainbow',
    config = function()
      vim.g.rainbow_active = 0
    end
  }
  use 'itchyny/lightline.vim'
  use 'chriskempson/base16-vim'
  use {
      'kyazdani42/nvim-tree.lua',
      requires = {
        'kyazdani42/nvim-web-devicons', -- optional, for file icon
      },
      config = function()
        vim.api.nvim_set_keymap('n', '<C-n>', ':NvimTreeToggle<CR>', { noremap = true, silent = true })
      end
  }
  use 'wfxr/minimap.vim'

  -- EDITOR
  use 'mhartington/formatter.nvim'
  use 'lewis6991/gitsigns.nvim'
  use {'junegunn/fzf', dir = '~/.fzf', run = './install --all' }
  use 'junegunn/fzf.vim'
  -- 'gcc' to comment line, 'gc' if in visual mode
  use 'tomtom/tcomment_vim'
  use { 'nvim-treesitter/nvim-treesitter', run = ':TSUpdate' }
  use {
    'airblade/vim-rooter',
    config = function()
      vim.g.rooter_manual_only = 1
    end
  }
  use 'godlygeek/tabular'
  use 'folke/todo-comments.nvim'
  use 'tpope/vim-sleuth'
  use {
    'windwp/nvim-autopairs',
    config = function()
      require('nvim-autopairs').setup{}
    end
  }

  -- SYNTAX
  use {
    'delphinus/vim-firestore',
    config = function()
      vim.g.vim_firestore_warnings = 0
    end
  }
  use 'digitaltoad/vim-pug'
  use 'keith/swift.vim'

end)
