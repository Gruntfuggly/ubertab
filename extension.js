var vscode = require( 'vscode' );

function activate( context )
{
    var forwardTargets = {
        '(': ')',
        '[': ']',
        '{': '}',
        '<': '>'
    };
    var backwardTargets = {
        ')': '(',
        ']': '[',
        '}': '{',
        '>': '<'
    };

    var nonAlphaNumeric = /[^a-z0-9\s]/i;

    var button = vscode.window.createStatusBarItem( vscode.StatusBarAlignment.Left, 0 );

    function setButton( enabled )
    {
        button.text = "$(diff-renamed) $(thumbs" + ( enabled ? "up" : "down" ) + ")";
        button.command = 'ubertab.' + ( enabled ? 'disable' : 'enable' );
        button.show();
    }

    function setEnabled( enabled )
    {
        vscode.workspace.getConfiguration( 'ubertab' ).update( 'enabled', enabled, false ).then( function()
        {
            vscode.commands.executeCommand( 'setContext', 'ubertab-enabled', enabled );
            setButton( enabled )
        } );
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

    function tabForward()
    {
        var editor = vscode.window.activeTextEditor;
        if( editor )
        {
            var document = editor.document;

            var newSelections = [];

            if( editor.selections.length === 1 )
            {
                var line = document.lineAt( editor.selections[ 0 ].start );
                var lineOffset = document.offsetAt( line.range.start );
                var cursorOffset = document.offsetAt( editor.selections[ 0 ].start );
                if( line.text.substring( 0, cursorOffset - lineOffset ).trim().length === 0 )
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
                var position = cursorOffset - lineOffset

                var moved = false;
                for( var c = position; c >= 0; --c )
                {
                    var character = line.text[ c ];
                    if( nonAlphaNumeric.test( character ) )
                    {
                        var target = forwardTarget( line.text[ c ] );
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
                    var spaceOffset = line.text.substring( position ).indexOf( ' ' );
                    if( spaceOffset > -1 )
                    {
                        var location = document.positionAt( lineOffset + position + spaceOffset + 1 );
                        newSelections.push( new vscode.Selection( location, location ) );
                    }
                }
            } );

            if( newSelections.length > 0 )
            {
                editor.selections = newSelections;
            }
        }
    }

    function tabBackward()
    {
        var editor = vscode.window.activeTextEditor;
        if( editor )
        {
            var document = editor.document;

            var newSelections = [];

            if( editor.selections.length === 1 )
            {
                var line = document.lineAt( editor.selections[ 0 ].start );
                var lineOffset = document.offsetAt( line.range.start );
                var cursorOffset = document.offsetAt( editor.selections[ 0 ].start );
                if( line.text.substring( 0, cursorOffset - lineOffset ).trim().length === 0 )
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
                var position = cursorOffset - lineOffset

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
                    var spaceOffset = line.text.substring( 0, position - 1 ).lastIndexOf( ' ' );
                    if( spaceOffset > -1 )
                    {
                        var location = document.positionAt( lineOffset + spaceOffset + 1 );
                        newSelections.push( new vscode.Selection( location, location ) );
                    }
                }
            } );

            if( newSelections.length > 0 )
            {
                editor.selections = newSelections;
            }
        }
    }

    context.subscriptions.push( vscode.commands.registerCommand( 'ubertab.enable', enable ) );
    context.subscriptions.push( vscode.commands.registerCommand( 'ubertab.disable', disable ) );
    context.subscriptions.push( vscode.commands.registerCommand( 'ubertab.tabForward', tabForward ) );
    context.subscriptions.push( vscode.commands.registerCommand( 'ubertab.tabBackward', tabBackward ) );

    setEnabled( vscode.workspace.getConfiguration( 'ubertab' ).get( 'enabled' ) );
}

exports.activate = activate;

function deactivate()
{
}
exports.deactivate = deactivate;