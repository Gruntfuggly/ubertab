var vscode = require( 'vscode' );

function isWhitespace( char )
{
    return ( char == ' ' || char == '\t' );
}

function indexOfWhitespace( text )
{
    var space = text.indexOf( ' ' );
    var tab = text.indexOf( '\t' );
    if( tab === -1 )
    {
        return space;
    }
    else if( space === -1 )
    {
        return tab;
    }
    else
    {
        return space < tab ? space : tab;
    }
}

function activate( context )
{
    var forwardTargets = {}
    var backwardTargets = {};

    var nonAlphaNumeric = /[^a-z0-9\s]/i;

    var button = vscode.window.createStatusBarItem( vscode.StatusBarAlignment.Left, 0 );

    var config = vscode.workspace.getConfiguration( 'ubertab' );

    function setOptions()
    {
        if( config.get( 'tabOutOfBraces', false ) !== true )
        {
            forwardTargets[ '{' ] = '}';
            backwardTargets[ '}' ] = '{';
        }
        if( config.get( 'tabOutOfBrackets', false ) !== true )
        {
            forwardTargets[ '(' ] = ')';
            backwardTargets[ ')' ] = '(';
        }
        if( config.get( 'tabOutOfSquareBrackets', false ) !== true )
        {
            forwardTargets[ '[' ] = ']';
            backwardTargets[ ']' ] = '[';
        }
        if( config.get( 'tabOutOfAngleBrackets', false ) !== true )
        {
            forwardTargets[ '<' ] = '>';
            backwardTargets[ '>' ] = '<';
        }
    }

    function setButton( enabled )
    {
        button.text = "$(diff-renamed) $(thumbs" + ( enabled ? "up" : "down" ) + ")";
        button.command = 'ubertab.' + ( enabled ? 'disable' : 'enable' );
        button.tooltip = ( enabled ? "Disable" : "Enable" ) + " Ubertab";

        if( config.get( 'showInStatusBar' ) === true )
        {
            button.show();
        }
        else
        {
            button.hide();
        }
    }

    function updateButton()
    {
        setButton( vscode.workspace.getConfiguration( 'ubertab' ).get( 'enabled' ) );
    }

    function setEnabled( enabled )
    {
        config.update( 'enabled', enabled );
        vscode.commands.executeCommand( 'setContext', 'ubertab-enabled', enabled );
    }

    function enable()
    {
        setEnabled( true );
    }

    function disable()
    {
        setEnabled( false );
    }

    function forwardTarget( c )
    {
        return forwardTargets[ c ] === undefined ? c : forwardTargets[ c ];
    }

    function backwardTarget( c )
    {
        return backwardTargets[ c ] === undefined ? c : backwardTargets[ c ];
    }

    function tabForward( editor )
    {
        var document = editor.document;

        var newSelections = [];

        if( editor.selections.length === 1 )
        {
            var line = document.lineAt( editor.selections[ 0 ].start );
            var lineOffset = document.offsetAt( line.range.start );
            var cursorOffset = document.offsetAt( editor.selections[ 0 ].start );
            var shouldIndent = config.get( 'shouldIndent', true );
            if( line.text.substring( 0, cursorOffset - lineOffset ).trim().length === 0 && shouldIndent )
            {
                vscode.commands.executeCommand( 'tab' );
                return;
            }
        }

        editor.selections.map( function( selection )
        {
            var line = document.lineAt( selection.start );
            var lineOffset = document.offsetAt( line.range.start );
            var cursorOffset = document.offsetAt( selection.start );
            var position = cursorOffset - lineOffset;

            var moved = false;
            for( var c = position; c >= 0; --c )
            {
                var character = line.text[ c ];
                if( nonAlphaNumeric.test( character ) )
                {
                    var target = forwardTarget( line.text[ c ] );
                    console.log( "Found '" + target + "'" );
                    var found = line.text.substring( position ).indexOf( target );
                    if( found > -1 )
                    {
                        var location = document.positionAt( lineOffset + position + found + 1 );
                        newSelections.push( new vscode.Selection( location, location ) );
                        moved = true;
                        break;
                    }
                }
            }
            if( moved === false )
            {
                console.log( "moving to whitespace" );
                var spaceOffset = indexOfWhitespace( line.text.substring( position ) );
                if( spaceOffset > -1 )
                {
                    while( isWhitespace( line.text[ position + spaceOffset + 1 ] ) )
                    {
                        spaceOffset++;
                    }
                    var location = document.positionAt( lineOffset + position + spaceOffset + 1 );
                    newSelections.push( new vscode.Selection( location, location ) );
                    moved = true;
                }
            }
            if( moved === false )
            {
                var location = document.positionAt( lineOffset + line.text.length + 1 );
                newSelections.push( new vscode.Selection( location, location ) );
            }
        } );

        if( newSelections.length > 0 )
        {
            editor.selections = newSelections;
        }
    }

    function tabBackward( editor )
    {
        var document = editor.document;

        var newSelections = [];

        if( editor.selections.length === 1 )
        {
            var line = document.lineAt( editor.selections[ 0 ].start );
            var lineOffset = document.offsetAt( line.range.start );
            var cursorOffset = document.offsetAt( editor.selections[ 0 ].start );
            var shouldIndent = config.get( 'shouldIndent', true );
            if( editor.selections[ 0 ].start.character === 0 )
            {
                var location = document.positionAt( lineOffset - 1 );
                editor.selections = [ new vscode.Selection( location, location ) ];
                return;
            }
            else if( line.text.substring( 0, cursorOffset - lineOffset ).trim().length === 0 && shouldIndent )
            {
                vscode.commands.executeCommand( 'outdent' );
                return;
            }
        }

        editor.selections.map( function( selection )
        {
            var line = document.lineAt( selection.start );
            var lineOffset = document.offsetAt( line.range.start );
            var cursorOffset = document.offsetAt( selection.start );
            var position = cursorOffset - lineOffset;

            var moved = false;
            for( var c = position - 1; c < line.range.end.character - line.range.start.character; ++c )
            {
                var character = line.text[ c ];
                if( nonAlphaNumeric.test( character ) )
                {
                    var target = backwardTarget( line.text[ c ] );
                    var found = line.text.substring( 0, position - 1 ).lastIndexOf( target );
                    if( found > -1 )
                    {
                        var location = document.positionAt( lineOffset + found + 1 );
                        newSelections.push( new vscode.Selection( location, location ) );
                        moved = true;
                        break;
                    }
                }
            }
            if( moved === false )
            {
                while( position > 0 && isWhitespace( line.text[ position - 1 ] ) )
                {
                    position--;
                }
                while( position > 0 && isWhitespace( line.text[ position - 1 ] ) === false )
                {
                    position--;
                }
                var location = document.positionAt( lineOffset + position );
                newSelections.push( new vscode.Selection( location, location ) );
            }
        } );

        if( newSelections.length > 0 )
        {
            editor.selections = newSelections;
        }
    }

    context.subscriptions.push( vscode.commands.registerCommand( 'ubertab.enable', enable ) );
    context.subscriptions.push( vscode.commands.registerCommand( 'ubertab.disable', disable ) );
    context.subscriptions.push( vscode.commands.registerTextEditorCommand( 'ubertab.tabForward', tabForward ) );
    context.subscriptions.push( vscode.commands.registerTextEditorCommand( 'ubertab.tabBackward', tabBackward ) );

    context.subscriptions.push( vscode.workspace.onDidChangeConfiguration( function( e )
    {
        if( e.affectsConfiguration( 'ubertab' ) )
        {
            setOptions();
            updateButton();
        }
    } ) );

    vscode.commands.executeCommand( 'setContext', 'ubertab-enabled', config.get( 'enabled' ) );

    setOptions();
    updateButton();
}

exports.activate = activate;

function deactivate()
{
}
exports.deactivate = deactivate;
