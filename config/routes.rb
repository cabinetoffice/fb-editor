Rails.application.routes.draw do
  namespace :admin do
    resources :overviews, only: [:index]
    resources :legacy_service_names
    resources :uptime_checks, only: [:index, :create, :destroy]
    resources :services, only: [:index, :show, :edit, :update, :create, :destroy] do
      post '/unpublish/:publish_service_id/:deployment_environment',
        to: 'services#unpublish', as: :unpublish
      post '/republish/:publish_service_id/:deployment_environment',
        to: 'services#republish', as: :republish

      get '/approve/:service_id', to: 'services#approve', as: :approve
      get '/revoke_approval/:service_id', to: 'services#revoke_approval', as: :revoke_approval

      resources :api_submission, only: [:create, :index]
      resources :versions, only: [:update, :edit, :show]

    end
    resources :users
    resources :publish_services
    get '/test-service/:test_service_name/(:fixture)', to: 'test_services#create', as: :test_service
    get '/export-services', to: 'overviews#export_services'

    root to: "overviews#index"
  end

  get '/health', to: 'health#show'
  get '/readiness', to: 'health#readiness'
  get '/metrics', to: 'metrics#show'

  # Cognito routes
  get "/auth/cognito-idp/callback", to: "cognito_idp#callback"
  get "/auth/failure", to: "cognito_idp#failure"

  get '/signup_not_allowed', to: 'user_sessions#signup_not_allowed', as: 'signup_not_allowed'
  get '/signup_error/:error_type', to: 'user_sessions#signup_error', as: 'signup_error'
  get '/unauthorised', to: 'user_sessions#unauthorised'
  resource :user_session, only: [:destroy]

  if Rails.env.development?
    post '/auth/developer/callback' => 'cognito_idp#developer_callback'
  end

  resources :services, only: [:index, :edit, :update, :create] do
    member do
      resources :publish, only: [:index, :create]
      post '/publish_for_review', to: 'publish#publish_for_review'
      resources :pages, param: :page_uuid, only: [:create, :edit, :update, :destroy]
      resources :branches, param: :branch_uuid, only: [:create, :edit, :update, :destroy] do
        collection do
          get '/:previous_flow_uuid/new', to: 'branches#new', as: 'new'
        end
      end



      resources :settings, only: [:index]
      namespace :settings do
        resources :form_information, only: [:index, :create]
        resources :form_name_url, only: [:index, :create]
        resources :form_analytics, only: [:index, :create]
        resources :reference_payment, only: [:index, :create]
        resources :save_and_return, only: [:index, :create]
        resources :submission, only: [:index] do
          collection do
            resources :email, only: [:index, :create]
            resources :confirmation_email, only: [:index, :create]
          end
        end
      end

      mount MetadataPresenter::Engine => '/preview', as: :preview
    end
  end

  namespace :api do
    resources :services do
      resources :flow, param: :uuid, only: [] do
        resources :destinations, only: [:new, :create]
        get '/move/(:previous_flow_uuid)/(:previous_conditional_uuid)', to: 'move#targets', as: :move
        post :move, to: 'move#change'
      end

      resources :pages, only: [:show] do
        get '/destroy-message', to: 'pages#destroy_message', as: :destroy_message

        resources :questions, only: [] do
          get '/destroy-message', to: 'questions#destroy_message', as: :destroy_message
          resources :question_options, only: [] do
            get '/destroy-message', to: 'question_options#destroy_message', as: :destroy_message
          end
        end

        get '/component-validations/:component_id/:validator', as: :component_validations, to: 'component_validations#new'
        post '/component-validations/:component_id/:validator', to: 'component_validations#create'
      end

      resources :branches, param: :previous_flow_uuid do
        get '/conditionals/:conditional_index', to: 'branches#new_conditional'
        get '/destroy-message', to: 'branches#destroy_message', as: :destroy_message
        get '/conditionals/:conditional_index/expressions/:expression_index/component/:component_uuid', to: 'expressions#show', as: 'expressions'
      end

      post 'conditional_content/components/:component_uuid/edit', to: 'conditional_contents#edit', as: 'edit_conditional_content'
      put 'conditional_content/components/:component_uuid', to: 'conditional_contents#update', as: 'update_conditional_content'
      get 'conditional_content/components/:content_component_uuid/conditionals/:conditional_index/expressions/:expression_index/component/:component_uuid', to: 'conditional_content_expressions#show', as: 'conditional_content_expressions'

      get '/components/:component_id/autocomplete', to: 'autocomplete#show', as: :autocomplete
      post '/components/:component_id/autocomplete', to: 'autocomplete#create'

      get '/versions/previous/:operation/:undoable_action', to: 'undo#show', as: :previous_version,
          constraints: { operation: /undo|redo/ }

      get '/first-publish/:environment', to: 'first_publish#show', environment: /dev|production/, as: :first_publish
    end
  end

  root to: 'home#show'
end
