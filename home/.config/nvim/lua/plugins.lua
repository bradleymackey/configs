vim.cmd [[packadd packer.nvim]]

return require('packer').startup(function()
  -- Packer can manage itself
  use 'wbthomason/packer.nvim'

  -- EXPERIMENTAL
  use {
    'github/copilot.vim',
    config = function()
      vim.cmd("imap <silent><script><expr> <C-L> copilot#Accept()")
      vim.cmd("let g:copilot_no_tab_map = v:true")
      vim.cmd("let g:copilot_enabled = v:false")
    end
  }

  -- LSP
  use {
    'neovim/nvim-lspconfig'
  }
  use 'nvim-lua/plenary.nvim'
  use {
    'jose-elias-alvarez/null-ls.nvim',
    config = function()
      -- null-ls is used for non-lsp stuff
      local null_ls = require("null-ls")
      local formatting = null_ls.builtins.formatting
      local diagnostics = null_ls.builtins.diagnostics
      local code_actions = null_ls.builtins.code_actions

      null_ls.setup({
        capabilities = capabilities,
        on_attach = function(client)
          -- Trigger formatting if the client supports it.
          if client.server_capabilities.documentFormattingProvider then
            vim.cmd("autocmd BufWritePre <buffer> lua vim.lsp.buf.formatting_sync()")
          end
        end,
        diagnostics_format = "#{m}",
        debounce = 250,
        default_timeout = 5000,
        sources = {
          formatting.prettier,
          formatting.black,
          -- diagnostics.write_good,
          diagnostics.eslint_d,
          diagnostics.flake8,
          code_actions.gitsigns,
        },
      })
    end,
    requires = { 'nvim-lua/plenary.nvim' }
  }
  use 'nvim-lua/lsp-status.nvim'

  -- COMPLETION
  use {
    'hrsh7th/nvim-cmp',
    config = function()
      require('completion')
    end,
    requires = {
      'hrsh7th/cmp-nvim-lsp',
      'hrsh7th/cmp-buffer',
      'hrsh7th/cmp-path',
      'hrsh7th/cmp-cmdline',
      'hrsh7th/cmp-vsnip',
      'hrsh7th/vim-vsnip',
      'onsails/lspkind-nvim',
      'hrsh7th/cmp-nvim-lsp-signature-help'
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
        require('nvim-tree-config')
      end
  }
  use 'wfxr/minimap.vim'

  -- EDITOR
  use {
    'lewis6991/gitsigns.nvim',
    requires = {
      'nvim-lua/plenary.nvim',
    },
    config = function()
      require('gitsigns-config')
    end
  }
  use {'junegunn/fzf', dir = '~/.fzf', run = './install --all' }
  use 'junegunn/fzf.vim'
  -- 'gcc' to comment line, 'gc' if in visual mode
  use 'tomtom/tcomment_vim'
  use { 
    'nvim-treesitter/nvim-treesitter', 
    run = ':TSUpdate',
    config = function()
      require('tree-sitter-config')
    end
  }
  use {
    'airblade/vim-rooter',
    config = function()
      vim.g.rooter_manual_only = 1
    end
  }
  use 'godlygeek/tabular'
  use {
    'folke/todo-comments.nvim',
    config = function()
      require('todo-config')
    end
  }
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
